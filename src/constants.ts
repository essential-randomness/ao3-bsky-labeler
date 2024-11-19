import { Label } from './types.js';

export const DELETE = 'insert-rkey-of-delete-post-here';
export const LABEL_LIMIT = 1;
export const ROOT_POST = 'Like the replies to this post to add an AO3 rating label to your account (for funsies!).';
export const DELETE_POST = 'Like this post to delete the AO3 rating label from your account.';
export const LABELS: Label[] = [
  {
    rkey: 'insert-rkey-here',
    identifier: 'general-audiences',
    post: "Like this post to give yourself the General Audiences label (for funsies!)",
    locales: [
      { lang: 'en', name: 'General Audiences', 
        description: 'This user marked themselves as General Audiences (for funsies!)'
      },
    ]
  },
  {
    rkey: 'insert-rkey-here',
    identifier: 'teen-and-up',
    post: "Like this post to give yourself the Teen and Up Audiences label (for funsies!)",
    locales: [
      { lang: 'en', name: 'Teen and Up Audiences', 
        description: 'This user marked themselves as Teen and Up Audiences (for funsies!)'
      },
    ]
  },
  {
    rkey: 'insert-rkey-here',
    identifier: 'explicit',
    post: "Like this post to give yourself the Explicit label (for funsies!)",
    locales: [
      { lang: 'en', name: 'Explicit', 
        description: 'This user marked themselves as Explicit (for funsies!)'
      },
    ]
  },
  {
    rkey: 'insert-rkey-here',
    identifier: 'mature',
    post: "Like this post to give yourself the Mature label (for funsies!)",
    locales: [
      { lang: 'en', name: 'Mature', 
        description: 'This user marked themselves as Mature (for funsies!)'
      },
    ]
  },
  {
    rkey: 'insert-rkey-here',
    identifier: 'not-rated',
    post: "Like this post to give yourself the Not Rated label (for funsies!)",
    locales: [
      { lang: 'en', name: 'Not Rated', 
        description: 'This user marked themselves as Not Rated (for funsies!)'
      },
    ]
  },
];
