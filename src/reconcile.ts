import { DID, PORT } from './config.js';
import { LABEL_SETS } from './constants.js';
import { Label, LabelSet } from './types.js';

const BSKY_PUBLIC_API = 'https://public.api.bsky.app';
const LABELER_URL = process.env.LABELER_URL ?? `http://127.0.0.1:${PORT}`;
const USE_ACTUAL_DB = process.argv.includes('--actual-db');
const APPLY = process.argv.includes('--apply');

interface LikeActor {
  did: string;
  handle: string;
  displayName?: string;
}

interface Like {
  actor: LikeActor;
  createdAt: string;
  indexedAt: string;
}

interface GetLikesResponse {
  cursor?: string;
  likes: Like[];
}

interface GetProfilesResponse {
  profiles: LikeActor[];
}

interface QueryLabelsResponse {
  cursor?: string;
  labels: LabelRecord[];
}

interface LabelRecord {
  src: string;
  uri: string;
  val: string;
  neg?: boolean;
  cts?: string;
}

interface ReconcileAction {
  type: 'label' | 'delete';
  label?: Label;
  labelSet: LabelSet;
  actor: LikeActor;
  createdAt: string;
  postRkey: string;
}

interface PlannedChange {
  actor: LikeActor;
  labelSet: LabelSet;
  label: Label;
  reason?: string;
  detail?: string;
}

interface ActorState {
  actor: LikeActor;
  labels: Set<string>;
}

// Per actor, per label set: what likes are CURRENTLY active (from getLikes).
interface ActorSetLikes {
  activeLabels: Set<string>; // label identifiers the actor currently likes
  likedDelete: boolean; // actor currently likes the delete post for this set
}

const labelSetsByLabel = new Map<string, LabelSet>();
const labelsByIdentifier = new Map<string, Label>();
const actorDirectory = new Map<string, LikeActor>();

for (const labelSet of LABEL_SETS) {
  for (const label of labelSet.labels) {
    labelSetsByLabel.set(label.identifier, labelSet);
    labelsByIdentifier.set(label.identifier, label);
  }
}

const labelIdentifiers = new Set(labelsByIdentifier.keys());

function postUri(rkey: string) {
  return `at://${DID}/app.bsky.feed.post/${rkey}`;
}

function labelName(label: Label) {
  return label.locales[0]?.name ?? label.identifier;
}

function actorName(actor: LikeActor) {
  const displayName = actor.displayName ? ` (${actor.displayName})` : '';
  return `${actor.handle}${displayName} <${actor.did}>`;
}

function rememberActor(actor: LikeActor) {
  actorDirectory.set(actor.did, actor);
}

async function getJson<T>(url: URL): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GET ${url.toString()} failed with ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

async function fetchLikes(uri: string): Promise<Like[]> {
  const likes: Like[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL('/xrpc/app.bsky.feed.getLikes', BSKY_PUBLIC_API);
    url.searchParams.set('uri', uri);
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);

    const body = await getJson<GetLikesResponse>(url);
    for (const like of body.likes) {
      rememberActor(like.actor);
      likes.push(like);
    }
    cursor = body.cursor;
  } while (cursor);

  return likes;
}

async function fetchProfiles(dids: string[]) {
  for (let i = 0; i < dids.length; i += 25) {
    const batch = dids.slice(i, i + 25);
    const url = new URL('/xrpc/app.bsky.actor.getProfiles', BSKY_PUBLIC_API);
    for (const did of batch) {
      url.searchParams.append('actors', did);
    }

    const body = await getJson<GetProfilesResponse>(url);
    for (const profile of body.profiles) {
      rememberActor(profile);
    }
  }
}

async function fetchLabelerLabels(): Promise<LabelRecord[]> {
  const labels: LabelRecord[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL('/xrpc/com.atproto.label.queryLabels', LABELER_URL);
    url.searchParams.append('uriPatterns', '*');
    url.searchParams.append('sources', DID);
    url.searchParams.set('limit', '250');
    if (cursor && cursor !== '0') url.searchParams.set('cursor', cursor);

    const body = await getJson<QueryLabelsResponse>(url);
    const matchingLabels = body.labels.filter((label) => labelIdentifiers.has(label.val));
    labels.push(...matchingLabels);

    if (body.labels.length === 0 || !body.cursor || body.cursor === '0') {
      cursor = undefined;
    } else {
      cursor = body.cursor;
    }
  } while (cursor);

  return labels;
}

async function fetchActions() {
  const actions: ReconcileAction[] = [];

  for (const labelSet of LABEL_SETS) {
    for (const label of labelSet.labels) {
      const likes = await fetchLikes(postUri(label.rkey));
      for (const like of likes) {
        actions.push({
          type: 'label',
          label,
          labelSet,
          actor: like.actor,
          createdAt: like.createdAt,
          postRkey: label.rkey,
        });
      }
    }

    const deleteLikes = await fetchLikes(postUri(labelSet.deletePost.rkey));
    for (const like of deleteLikes) {
      actions.push({
        type: 'delete',
        labelSet,
        actor: like.actor,
        createdAt: like.createdAt,
        postRkey: labelSet.deletePost.rkey,
      });
    }
  }

  return actions;
}

function actionTime(action: ReconcileAction) {
  return new Date(action.createdAt).getTime();
}

function buildDesiredState(actions: ReconcileAction[]) {
  const actionsBySetAndActor = new Map<LabelSet, Map<string, ReconcileAction[]>>();

  for (const action of actions) {
    let actionsByActor = actionsBySetAndActor.get(action.labelSet);
    if (!actionsByActor) {
      actionsByActor = new Map();
      actionsBySetAndActor.set(action.labelSet, actionsByActor);
    }

    const actorActions = actionsByActor.get(action.actor.did) ?? [];
    actorActions.push(action);
    actionsByActor.set(action.actor.did, actorActions);
  }

  const desired = new Map<string, ActorState>();

  for (const [labelSet, actionsByActor] of actionsBySetAndActor.entries()) {
    for (const [did, actorActions] of actionsByActor.entries()) {
      const actor = actorDirectory.get(did) ?? { did, handle: did };
      const state = desired.get(did) ?? { actor, labels: new Set<string>() };
      const labelsInSet = new Set(labelSet.labels.map((label) => label.identifier));

      actorActions.sort((a, b) => actionTime(a) - actionTime(b));

      for (const action of actorActions) {
        if (action.type === 'delete') {
          for (const label of labelsInSet) state.labels.delete(label);
          continue;
        }

        if (!action.label) continue;

        if (labelSet.labelLimit === 1) {
          for (const label of labelsInSet) state.labels.delete(label);
        }
        state.labels.add(action.label.identifier);
      }

      desired.set(did, state);
    }
  }

  return desired;
}

// Mirror of what the LIVE labeler reacts to: only currently-active likes.
function buildActorSetLikes(actions: ReconcileAction[]) {
  const byActor = new Map<string, Map<LabelSet, ActorSetLikes>>();

  for (const action of actions) {
    let bySet = byActor.get(action.actor.did);
    if (!bySet) {
      bySet = new Map();
      byActor.set(action.actor.did, bySet);
    }
    let info = bySet.get(action.labelSet);
    if (!info) {
      info = { activeLabels: new Set<string>(), likedDelete: false };
      bySet.set(action.labelSet, info);
    }
    if (action.type === 'delete') {
      info.likedDelete = true;
    } else if (action.label) {
      info.activeLabels.add(action.label.identifier);
    }
  }

  return byActor;
}

// Why does `actual` have a label that `desired` doesn't?
function categorizeRemove(change: PlannedChange, actorSetLikes: Map<string, Map<LabelSet, ActorSetLikes>>) {
  const info = actorSetLikes.get(change.actor.did)?.get(change.labelSet);
  const activeLabels = info?.activeLabels ?? new Set<string>();
  const likedDelete = info?.likedDelete ?? false;
  const id = change.label.identifier;
  const limited = change.labelSet.labelLimit !== -1;

  // Actor currently likes the delete post; live should have negated this => live missed the delete.
  if (likedDelete) return 'liked-delete-post (live missed delete)';
  // Limited set (ratings) with a later/competing like => desired replaced it; live missed the negation.
  if (limited && activeLabels.size > 0) return 'replaced (live missed negation)';
  // No active like for this label => actor UNLIKED it. Live deliberately keeps the label.
  if (!activeLabels.has(id)) return 'unliked (live keeps — expected)';
  // Still actively liked, no delete, no replacement => genuinely shouldn't be dropped from desired.
  return 'anomaly-still-liked';
}

// Why is `desired` missing from `actual`?
function categorizeAdd(change: PlannedChange, actual: Map<string, ActorState>) {
  const state = actual.get(change.actor.did);
  if (!state || state.labels.size === 0) return 'never-labeled (full miss)';
  return 'partial (missing one label)';
}

function labelSetName(labelSet: LabelSet) {
  const index = LABEL_SETS.indexOf(labelSet);
  const kind = labelSet.labelLimit === 1 ? 'ratings' : labelSet.labelLimit === -1 ? 'warnings' : `limit=${labelSet.labelLimit}`;
  return `set#${index} (${kind})`;
}

function tally(changes: PlannedChange[], key: (change: PlannedChange) => string) {
  const counts = new Map<string, number>();
  for (const change of changes) {
    const k = key(change);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function placeholdersForUnknownActors(dids: string[]) {
  for (const did of dids) {
    if (!actorDirectory.has(did)) {
      actorDirectory.set(did, { did, handle: did });
    }
  }
}

async function readActualRowsFromDb(): Promise<LabelRecord[]> {
  const { labelerServer } = await import('./label.js');
  const placeholders = Array.from(labelIdentifiers).map(() => '?').join(', ');
  const rows = labelerServer.db
    .prepare<string[]>(`SELECT uri, val, neg, cts FROM labels WHERE val IN (${placeholders}) ORDER BY cts ASC`)
    .all(...Array.from(labelIdentifiers)) as (LabelRecord & { neg?: boolean | number })[];

  return rows.map((row) => ({ ...row, src: DID, neg: Boolean(row.neg) }));
}

async function readActualState() {
  const rows = USE_ACTUAL_DB ? await readActualRowsFromDb() : await fetchLabelerLabels();

  const unknownDids = Array.from(new Set(rows.map((row) => row.uri))).filter((did) => !actorDirectory.has(did));
  if (unknownDids.length > 0) {
    try {
      await fetchProfiles(unknownDids);
    } catch {
      placeholdersForUnknownActors(unknownDids);
    }
  }

  const actual = new Map<string, ActorState>();
  const ctsByActorLabel = new Map<string, string>(); // `${did}::${val}` -> cts of the active (non-neg) label
  for (const row of rows) {
    const actor = actorDirectory.get(row.uri) ?? { did: row.uri, handle: row.uri };
    const state = actual.get(row.uri) ?? { actor, labels: new Set<string>() };
    if (row.neg) {
      state.labels.delete(row.val);
      ctsByActorLabel.delete(`${row.uri}::${row.val}`);
    } else {
      state.labels.add(row.val);
      if (row.cts) ctsByActorLabel.set(`${row.uri}::${row.val}`, row.cts);
    }
    actual.set(row.uri, state);
  }

  return { actual, ctsByActorLabel };
}

function diffStates(
  desired: Map<string, ActorState>,
  actual: Map<string, ActorState>,
  actorSetLikes: Map<string, Map<LabelSet, ActorSetLikes>>,
  ctsByActorLabel: Map<string, string>,
  likeCreatedAt: Map<string, string>,
) {
  const add: PlannedChange[] = [];
  const remove: PlannedChange[] = [];
  const unchanged: PlannedChange[] = [];
  const dids = new Set([...desired.keys(), ...actual.keys()]);

  for (const did of dids) {
    const desiredState = desired.get(did);
    const actualState = actual.get(did);
    const actor = desiredState?.actor ?? actualState?.actor ?? { did, handle: did };
    const desiredLabels = desiredState?.labels ?? new Set<string>();
    const actualLabels = actualState?.labels ?? new Set<string>();

    for (const labelId of desiredLabels) {
      const label = labelsByIdentifier.get(labelId);
      const labelSet = labelSetsByLabel.get(labelId);
      if (!label || !labelSet) continue;

      if (actualLabels.has(labelId)) {
        unchanged.push({ actor, labelSet, label });
      } else {
        const change: PlannedChange = { actor, labelSet, label };
        change.reason = categorizeAdd(change, actual);
        const liked = likeCreatedAt.get(`${did}::${labelId}`);
        if (liked) change.detail = `liked ${liked}`;
        add.push(change);
      }
    }

    for (const labelId of actualLabels) {
      if (desiredLabels.has(labelId)) continue;
      const label = labelsByIdentifier.get(labelId);
      const labelSet = labelSetsByLabel.get(labelId);
      if (!label || !labelSet) continue;
      const change: PlannedChange = { actor, labelSet, label };
      change.reason = categorizeRemove(change, actorSetLikes);
      const cts = ctsByActorLabel.get(`${did}::${labelId}`);
      if (cts) change.detail = `labeled ${cts}`;
      remove.push(change);
    }
  }

  return { add, remove, unchanged };
}

function printBreakdown(title: string, changes: PlannedChange[]) {
  console.log(`\n=== ${title}: ${changes.length} ===`);
  console.log('  by reason:');
  for (const [reason, count] of tally(changes, (c) => c.reason ?? 'unknown')) {
    console.log(`    ${count.toString().padStart(4)}  ${reason}`);
  }
  console.log('  by set:');
  for (const [set, count] of tally(changes, (c) => labelSetName(c.labelSet))) {
    console.log(`    ${count.toString().padStart(4)}  ${set}`);
  }
}

function printChanges(title: string, changes: PlannedChange[]) {
  console.log(`\n--- ${title} (${changes.length}) ---`);
  const sorted = [...changes].sort((a, b) => (a.reason ?? '').localeCompare(b.reason ?? ''));
  for (const change of sorted) {
    const reason = change.reason ? `  {${change.reason}}` : '';
    const detail = change.detail ? `  (${change.detail})` : '';
    console.log(
      `- [${labelSetName(change.labelSet)}] ${actorName(change.actor)} -> ${labelName(change.label)} [${change.label.identifier}]${reason}${detail}`,
    );
  }
}

// A remove is safe to auto-apply only if it's genuine drift, never a benign unlike.
function isApplicableRemove(change: PlannedChange) {
  return !change.reason?.startsWith('unliked');
}

// Writes labels straight into the labeler's SQLite DB via a LabelerServer instance.
// Adds = create; genuine-drift removes = negate. Benign unlikes are NEVER touched.
async function applyPlan(plan: { add: PlannedChange[]; remove: PlannedChange[] }) {
  const { labelerServer } = await import('./label.js');

  const ops = new Map<string, { create: Set<string>; negate: Set<string> }>();
  const opFor = (did: string) => {
    let op = ops.get(did);
    if (!op) {
      op = { create: new Set<string>(), negate: new Set<string>() };
      ops.set(did, op);
    }
    return op;
  };

  for (const change of plan.add) opFor(change.actor.did).create.add(change.label.identifier);
  let skippedUnlikes = 0;
  for (const change of plan.remove) {
    if (!isApplicableRemove(change)) {
      skippedUnlikes += 1;
      continue;
    }
    opFor(change.actor.did).negate.add(change.label.identifier);
  }

  let created = 0;
  let negated = 0;
  let actorsTouched = 0;
  let failures = 0;
  for (const [did, op] of ops.entries()) {
    const create = [...op.create];
    const negate = [...op.negate];
    if (create.length === 0 && negate.length === 0) continue;
    try {
      labelerServer.createLabels({ uri: did }, { create, negate });
      created += create.length;
      negated += negate.length;
      actorsTouched += 1;
    } catch (error) {
      failures += 1;
      console.error(`  ! failed to apply for ${did}: ${error}`);
    }
  }

  console.log(`\n=== APPLIED ===`);
  console.log(`  +${created} labels created, -${negated} labels negated across ${actorsTouched} actors`);
  console.log(`  ${skippedUnlikes} benign unlikes intentionally left in place`);
  if (failures > 0) console.log(`  ${failures} actors failed to apply (see errors above)`);
}

const actions = await fetchActions();
const labelActionCount = actions.filter((a) => a.type === 'label').length;
const deleteActionCount = actions.filter((a) => a.type === 'delete').length;
const desired = buildDesiredState(actions);
const actorSetLikes = buildActorSetLikes(actions);
// Earliest active-like time per actor+label, for spotting downtime windows in the adds.
const likeCreatedAt = new Map<string, string>();
for (const action of actions) {
  if (action.type !== 'label' || !action.label) continue;
  const key = `${action.actor.did}::${action.label.identifier}`;
  const existing = likeCreatedAt.get(key);
  if (!existing || action.createdAt < existing) likeCreatedAt.set(key, action.createdAt);
}
const { actual, ctsByActorLabel } = await readActualState();
const plan = diffStates(desired, actual, actorSetLikes, ctsByActorLabel, likeCreatedAt);

console.log('AO3 label reconcile diff');
console.log(`Actual label source: ${USE_ACTUAL_DB ? 'local SQLite DB' : LABELER_URL}`);
console.log(`Fetched visible like actions: ${actions.length} (label likes: ${labelActionCount}, delete-post likes: ${deleteActionCount})`);
console.log(`Actors with desired labels: ${desired.size}`);
console.log(`Actors with current AO3 labels: ${actual.size}`);
console.log(`Plan: +${plan.add.length} add  -${plan.remove.length} remove  =${plan.unchanged.length} unchanged`);

printBreakdown('Would add', plan.add);
console.log('  adds by like-month (when the like happened):');
for (const [month, count] of tally(plan.add, (c) => c.detail?.slice(6, 13) ?? 'unknown')) {
  console.log(`    ${count.toString().padStart(4)}  ${month}`);
}
printBreakdown('Would remove', plan.remove);

// Headline: how many removes are benign unlikes (live keeps) vs genuine drift?
const benignUnlikes = plan.remove.filter((c) => c.reason?.startsWith('unliked')).length;
const genuineRemoveDrift = plan.remove.length - benignUnlikes;
console.log(
  `\nRemove triage: ${benignUnlikes} benign unlikes (live intentionally keeps), ${genuineRemoveDrift} genuine drift worth applying.`,
);

printChanges('Would add', plan.add);
printChanges('Would remove', plan.remove);
printChanges('Already correct', plan.unchanged);

if (APPLY) {
  await applyPlan(plan);
  process.exit(0);
}
