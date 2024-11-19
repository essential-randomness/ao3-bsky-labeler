import { LabelSet } from './types.js';

const RATING_LABELS: LabelSet = {
  labelsThreadFormat: 'thread',
  labelLimit: 1,
  rootPostContent: 'Like the replies to this post to add an AO3 rating label to your account (for funsies!).',
  deletePost: {
    rkey: '3lbbdogu5c222',
    content: 'Like this post to delete the AO3 rating label from your account.',
  },
  labels: [
    {
      rkey: '3lbbdog7pld2l',
      identifier: 'general-audiences',
      post: 'Like this post to give yourself the General Audiences label (for funsies!)',
      locales: [
        {
          lang: 'en',
          name: 'General Audiences',
          description: 'This user marked themselves as General Audiences (for funsies!)',
        },
      ],
    },
    {
      rkey: '3lbbdogckkq2e',
      identifier: 'teen-and-up',
      post: 'Like this post to give yourself the Teen and Up Audiences label (for funsies!)',
      locales: [
        {
          lang: 'en',
          name: 'Teen and Up Audiences',
          description: 'This user marked themselves as Teen and Up Audiences (for funsies!)',
        },
      ],
    },
    {
      rkey: '3lbbdogkloc23',
      identifier: 'explicit',
      post: 'Like this post to give yourself the Explicit label (for funsies!)',
      locales: [
        { lang: 'en', name: 'Explicit', description: 'This user marked themselves as Explicit (for funsies!)' },
      ],
    },
    {
      rkey: '3lbbdognxfx2y',
      identifier: 'mature',
      post: 'Like this post to give yourself the Mature label (for funsies!)',
      locales: [{ lang: 'en', name: 'Mature', description: 'This user marked themselves as Mature (for funsies!)' }],
    },
    {
      rkey: '3lbbdogr7f32u',
      identifier: 'not-rated',
      post: 'Like this post to give yourself the Not Rated label (for funsies!)',
      locales: [
        { lang: 'en', name: 'Not Rated', description: 'This user marked themselves as Not Rated (for funsies!)' },
      ],
    },
  ],
};

const WARNINGS_LABELS: LabelSet = {
  labelsThreadFormat: 'thread',
  labelLimit: -1,
  rootPostContent: 'Like the replies to this post to add an AO3 Archive Warning label to your account (for funsies!).\n\n⚠️⚠️⚠️The replies to this post will contain sensitive topics⚠️⚠️⚠️\n⚠️⚠️⚠️   Remember: LIKES ARE PUBLIC!   ⚠️⚠️⚠️',
  deletePost: {
    rkey: '3lbbdofwt6h2y',
    content: 'Like this post to delete all AO3 Archive Warning labels from your account.',
  },
  labels: [
    {
      rkey: '3lbbdoffuiu2c',
      identifier: 'choose-not-to-use',
      post: 'Like this post to give yourself the Choose Not To Use Archive Warnings label (for funsies!)',
      locales: [
        {
          lang: 'en',
          name: '⚠️ Choose Not To Use Archive Warnings',
          description: 'This user marked themselves as Choosing Not To Use Archive Warnings (for funsies!)',
        },
      ],
    },
    {
      rkey: '3lbbdofilus2m',
      identifier: 'no-warnings',
      post: 'Like this post to give yourself the No Archive Warnings Apply label (for funsies!)',
      locales: [
        {
          lang: 'en',
          name: '🌱 No Archive Warnings Apply',
          description: 'This user marked themselves as No Archive Warnings Apply (for funsies!)',
        },
      ],
    },
    {
      rkey: '3lbbdoflnki2b',
      identifier: 'graphic-violence',
      post: 'Like this post to give yourself the Graphic Depictions of Violence label (for funsies!)',
      locales: [
        {
          lang: 'en',
          name: '⚠️ Graphic Depictions of Violence',
          description: 'This user marked themselves as Graphic Depictions of Violence (for funsies!)',
        },
      ],
    },
    {
      rkey: '3lbbdofogz626',
      identifier: 'major-death',
      post: 'Like this post to give yourself the Major Character Death label (for funsies!)',    
      locales: [
        {
          lang: 'en',
          name: '⚠️ Major Character Death',
          description: 'This user marked themselves as Major Character Death (for funsies!)',
        },
      ],
    },
    {
      rkey: '3lbbdofr5wa2e',
      identifier: 'non-con',      
      post: 'Like this post to give yourself the Non-Con label (for funsies!)',
      locales: [
        {
          lang: 'en',
          name: '⚠️ Non-Con',
          description: 'This user marked themselves as Non-Con (for funsies!)',
        },
      ],
    },
    {
      rkey: '3lbbdoftv7c2m',
      identifier: 'underage',      
      post: 'Like this post to give yourself the Underage label (for funsies!)',
      locales: [
        {
          lang: 'en',
          name: '⚠️ Underage',
          description: 'This user marked themselves as Underage (for funsies!)',
        },
      ],
    },
  ],
};

export const LABEL_SETS: LabelSet[] = [WARNINGS_LABELS, RATING_LABELS];
