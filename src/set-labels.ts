import { type ComAtprotoLabelDefs } from '@atproto/api';
import { type LoginCredentials, setLabelerLabelDefinitions } from '@skyware/labeler/scripts';

import { BSKY_IDENTIFIER, BSKY_PASSWORD } from './config.js';
import { LABEL_SETS } from './constants.js';
import logger from './logger.js';

const loginCredentials: LoginCredentials = {
  identifier: BSKY_IDENTIFIER,
  password: BSKY_PASSWORD,
};

const labelDefinitions: ComAtprotoLabelDefs.LabelValueDefinition[] = [];

for (const labelSet of LABEL_SETS) {
  const setDefinitions = [];
  for (const label of labelSet.labels) {
    const labelValueDefinition: ComAtprotoLabelDefs.LabelValueDefinition = {
      identifier: label.identifier,
      severity: 'inform',
      blurs: 'none',
      defaultSetting: 'warn',
      adultOnly: false,
      locales: label.locales,
    };

    setDefinitions.push(labelValueDefinition);
  }
  labelDefinitions.unshift(...setDefinitions);
}

try {
  await setLabelerLabelDefinitions(loginCredentials, labelDefinitions);
  logger.info('Label definitions set successfully.');
} catch (error) {
  logger.error(`Error setting label definitions: ${error}`);
}
