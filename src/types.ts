import { LabelValueDefinitionStrings } from '@atproto/api/dist/client/types/com/atproto/label/defs.js';

export interface Label {
  rkey: string;
  identifier: string;
  post?: string;
  locales: LabelValueDefinitionStrings[];
}

export interface LabelSet {
  // Whether the labels should be posted as a thread (where each label setter is a
  // reply to the previous post) or as a series of replies to the root post.
  labelsThreadFormat: 'thread' | 'root_replies';
  deletePost: {
    rkey: string;
    content: string;
  };
  labelLimit: number;
  rootPostContent: string;
  labels: Label[];
}
