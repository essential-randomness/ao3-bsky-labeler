import { ComAtprotoLabelDefs } from '@atcute/client/lexicons';
import { LabelerServer } from '@skyware/labeler';

import { DID, SIGNING_KEY, DB_PATH } from './config.js';
import { LABEL_SETS } from './constants.js';
import logger from './logger.js';
import { LabelSet } from './types.js';

const LABELS_IN_SET = new Map<LabelSet, string[]>();
for (const labelSet of LABEL_SETS) {
  LABELS_IN_SET.set(labelSet, [labelSet.deletePost.rkey, ...labelSet.labels.map((l) => l.rkey)]);
}

export const labelerServer = new LabelerServer({ did: DID, signingKey: SIGNING_KEY, dbPath: DB_PATH });

export const label = (did: string, rkey: string) => {
  logger.info(`Received rkey: ${rkey} for ${did}`);

  if (rkey === 'self') {
    logger.info(`${did} liked the labeler. Returning.`);
    return;
  }
  try {
    const labels = fetchCurrentLabels(did);

    for (const labelSet of LABEL_SETS) {
      if (!LABELS_IN_SET.get(labelSet)?.includes(rkey)) {
        continue;
      }
      if (rkey.includes(labelSet.deletePost.rkey)) {
        deleteAllLabels(did, new Set(labelSet.labels.map((l) => l.identifier)));
      } else {
        addOrUpdateLabel(did, rkey, labels, labelSet);
      }
    }
  } catch (error) {
    logger.error(`Error in \`label\` function: ${error}`);
  }
};

function fetchCurrentLabels(did: string) {
  const query = labelerServer.db
    .prepare<string[]>(`SELECT * FROM labels WHERE uri = ?`)
    .all(did) as ComAtprotoLabelDefs.Label[];

  const labels = query.reduce((set, label) => {
    if (!label.neg) set.add(label.val);
    else set.delete(label.val);
    return set;
  }, new Set<string>());

  if (labels.size > 0) {
    logger.info(`Current labels: ${Array.from(labels).join(', ')}`);
  }

  return labels;
}

function deleteAllLabels(did: string, labels: Set<string>) {
  const labelsToDelete: string[] = Array.from(labels);

  if (labelsToDelete.length === 0) {
    logger.info(`No labels to delete`);
  } else {
    logger.info(`Labels to delete: ${labelsToDelete.join(', ')}`);
    try {
      labelerServer.createLabels({ uri: did }, { negate: labelsToDelete });
      logger.info('Successfully deleted all labels');
    } catch (error) {
      logger.error(`Error deleting all labels: ${error}`);
    }
  }
}

function addOrUpdateLabel(did: string, rkey: string, labels: Set<string>, labelSet: LabelSet) {
  const newLabel = labelSet.labels.find((label) => label.rkey === rkey);
  if (!newLabel) {
    logger.warn(`New label not found: ${rkey}. Likely liked a post that's not one for labels.`);
    return;
  }
  logger.info(`New label: ${newLabel.identifier}`);

  if (labelSet.labelLimit !== -1 && labels.size >= labelSet.labelLimit) {
    try {
      const toNegate = Array.from(labels).filter(
        (label) => !!labelSet.labels.find((setLabel) => label == setLabel.identifier),
      );
      labelerServer.createLabels({ uri: did }, { negate: toNegate });
      logger.info(`Successfully negated existing labels: ${toNegate.join(', ')}`);
    } catch (error) {
      logger.error(`Error negating existing labels: ${error}`);
    }
  }

  try {
    labelerServer.createLabel({ uri: did, val: newLabel.identifier });
    logger.info(`Successfully labeled ${did} with ${newLabel.identifier}`);
  } catch (error) {
    logger.error(`Error adding new label: ${error}`);
  }
}
