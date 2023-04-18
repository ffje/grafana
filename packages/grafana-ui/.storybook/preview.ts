import { Preview } from '@storybook/react';
import 'jquery';

import '../../../public/vendor/flot/jquery.flot.js';
import '../../../public/vendor/flot/jquery.flot.selection';
import '../../../public/vendor/flot/jquery.flot.time';
import '../../../public/vendor/flot/jquery.flot.stack';
import '../../../public/vendor/flot/jquery.flot.stackpercent';
import '../../../public/vendor/flot/jquery.flot.fillbelow';
import '../../../public/vendor/flot/jquery.flot.crosshair';
import '../../../public/vendor/flot/jquery.flot.dashes';
import '../../../public/vendor/flot/jquery.flot.gauge';

import { withTheme } from '../src/utils/storybook/withTheme';
import { ThemedDocsContainer } from '../src/utils/storybook/ThemedDocsContainer';

// @ts-ignore
import lightTheme from './grafana.light.scss';
// @ts-ignore
import darkTheme from './grafana.dark.scss';
import { GrafanaLight, GrafanaDark } from './storybookTheme';

const handleThemeChange = (theme: any) => {
  if (theme !== 'light') {
    lightTheme.unuse();
    darkTheme.use();
  } else {
    darkTheme.unuse();
    lightTheme.use();
  }
};

const preview: Preview = {
  decorators: [withTheme(handleThemeChange)],
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    darkMode: {
      dark: GrafanaDark,
      light: GrafanaLight,
    },
    docs: {
      container: ThemedDocsContainer,
    },
    knobs: {
      disable: true,
    },
    layout: 'fullscreen',
    options: {
      storySort: {
        method: 'alphabetical',
        order: ['Docs Overview', ['Intro']],
      },
    },
  },
};

export default preview;
