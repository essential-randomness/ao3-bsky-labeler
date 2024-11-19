import { Label } from './types.js';


// Whether the labels should be posted as a thread (where each label setter is a 
// reply to the previous post) or as a series of replies to the root post.
export const LABELS_THREAD_FORMAT : "thread" | "root_replies" = "thread";  
export const DELETE = '3lbb76xzv772m';
export const LABEL_LIMIT = 1;
export const ROOT_POST = 'Like the replies to this post to add an AO3 rating label to your account (for funsies!).';
export const DELETE_POST = 'Like this post to delete the AO3 rating label from your account.';
export const LABELS: Label[] = [
  {
    rkey: '3lbb76xktmf2p',
    identifier: 'general-audiences',
    post: "Like this post to give yourself the General Audiences label (for funsies!)",
    locales: [
      { lang: 'en', name: 'General Audiences', 
        description: 'This user marked themselves as General Audiences (for funsies!)'
      },
    ]
  },
  {
    rkey: '3lbb76xo4452p',
    identifier: 'teen-and-up',
    post: "Like this post to give yourself the Teen and Up Audiences label (for funsies!)",
    locales: [
      { lang: 'en', name: 'Teen and Up Audiences', 
        description: 'This user marked themselves as Teen and Up Audiences (for funsies!)'
      },
    ]
  },
  {
    rkey: '3lbb76xrahl23',
    identifier: 'explicit',
    post: "Like this post to give yourself the Explicit label (for funsies!)",
    locales: [
      { lang: 'en', name: 'Explicit', 
        description: 'This user marked themselves as Explicit (for funsies!)'
      },
    ]
  },
  {
    rkey: '3lbb76xtv7v2l',
    identifier: 'mature',
    post: "Like this post to give yourself the Mature label (for funsies!)",
    locales: [
      { lang: 'en', name: 'Mature', 
        description: 'This user marked themselves as Mature (for funsies!)'
      },
    ]
  },
  {
    rkey: '3lbb76xwtov22',
    identifier: 'not-rated',
    post: "Like this post to give yourself the Not Rated label (for funsies!)",
    locales: [
      { lang: 'en', name: 'Not Rated', 
        description: 'This user marked themselves as Not Rated (for funsies!)'
      },
    ]
  },
];
