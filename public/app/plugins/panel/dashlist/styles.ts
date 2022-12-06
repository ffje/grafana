import { css } from '@emotion/css';

import { GrafanaTheme2 } from '@grafana/data';

export const getStyles = (theme: GrafanaTheme2) => ({
  dashlistSectionHeader: css`
    margin-bottom: ${theme.spacing(1)};
    color: ${theme.colors.text.secondary};
    text-align: center;
  `,
  dashlistSection: css`
    margin-bottom: ${theme.spacing(2)};
    padding-top: 3px;
  `,
  dashlistLink: css`
    display: flex;
    cursor: pointer;
    border-bottom: 1px solid ${theme.colors.border.medium};
    margin-right: ${theme.spacing(1)};
    padding: 7px 7px 7px 0px;
    &:hover {
      background: ${theme.colors.emphasize(theme.colors.background.primary, 0.03)};
      a {
        text-decoration: underline;
      }
    }
  `,
  dashlistStar: css`
    align-self: center;
    margin-right: 0px;
    color: ${theme.colors.secondary.text};
    z-index: 1;
  `,
  dashlistFolder: css`
    color: ${theme.colors.secondary.text};
    font-size: ${theme.typography.bodySmall.fontSize};
    line-height: ${theme.typography.body.lineHeight};
  `,
  dashlistTitle: css`
    &::after {
      position: absolute;
      content: '';
      left: 0;
      top: 0;
      bottom: 0;
      right: 0;
    }
  `,
  dashlistLinkBody: css`
    flex-grow: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  dashlistItem: css`
    position: relative;
    list-style: none;
  `,
  gridContainer: css`
    display: grid;
    gap: ${theme.spacing(1)};
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    list-style: none;
    margin-bottom: ${theme.spacing(1)};
  `,
});
