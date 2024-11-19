import { Bot } from '@skyware/bot';

import { BSKY_IDENTIFIER, BSKY_PASSWORD } from './config.js';
import { LABEL_SETS } from './constants.js';

const bot = new Bot();

try {
  await bot.login({
    identifier: BSKY_IDENTIFIER,
    password: BSKY_PASSWORD,
  });
} catch (error) {
  console.error('Error logging in: ', error);
  process.exit(1);
}

process.stdout.write('WARNING: This will delete all posts in your profile. Are you sure you want to continue? (y/n) ');

const answer = await new Promise((resolve) => {
  process.stdin.once('data', (data) => {
    resolve(data.toString().trim().toLowerCase());
  });
});

if (answer === 'y') {
  const postsToDelete = await bot.profile.getPosts();
  for (const post of postsToDelete.posts) {
    await post.delete();
  }
  console.log('All posts have been deleted.');
} else {
  console.log('Operation cancelled.');
  process.exit(0);
}

for (const labelSet of LABEL_SETS) {
  const post = await bot.post({
    text: labelSet.rootPostContent,
    threadgate: { allowLists: [] },
  });

  const labelNames = labelSet.labels.map(
    (label) => label.post ?? label.locales.map((locale) => locale.name).join(' | '),
  );
  const labelRkeys: Record<string, string> = {};
  let replyTo = post;
  for (const labelName of labelNames) {
    const labelPost = await replyTo.reply({ text: labelName });
    labelRkeys[labelName] = labelPost.uri.split('/').pop()!;
    if (labelSet.labelsThreadFormat == 'thread') {
      replyTo = labelPost;
    }
  }

  console.log('Label rkeys:');
  for (const [name, rkey] of Object.entries(labelRkeys)) {
    console.log(`    name: '${name}',`);
    console.log(`    rkey: '${rkey}',`);
  }

  const deletePost =
    labelSet.labelsThreadFormat == 'thread' ?
      await replyTo.reply({ text: labelSet.deletePost.content })
    : await bot.post({ text: labelSet.deletePost.content });
  const deletePostRkey = deletePost.uri.split('/').pop()!;
  console.log('Delete post rkey:');
  console.log(`export const DELETE = '${deletePostRkey}';`);
}
process.exit(0);
