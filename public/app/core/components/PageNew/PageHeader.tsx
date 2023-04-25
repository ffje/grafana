import { css } from '@emotion/css';
import React from 'react';

import { NavModelItem, GrafanaTheme2 } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { Badge, InlineField, InlineSwitch, Input, useStyles2 } from '@grafana/ui';

import { PageInfoItem } from '../Page/types';
import { PageInfo } from '../PageInfo/PageInfo';

export interface Props {
  navItem: NavModelItem;
  actions?: React.ReactNode;
  dataSourceName: string;
  isDefault: boolean;
  onNameChange: (name: string) => void;
  onDefaultChange: (value: boolean) => void;
  alertingSupported: boolean;
  info?: PageInfoItem[];
  subTitle?: React.ReactNode;
}
// this is the pageHeader. Needs custom componnet of editable name input, default datasource toggle, alerging badge
export function PageHeader({
  navItem,
  actions,
  dataSourceName,
  isDefault,
  onNameChange,
  onDefaultChange,
  alertingSupported,
  info,
  subTitle,
}: Props) {
  const styles = useStyles2(getStyles);
  const sub = subTitle ?? navItem.subTitle;
  const nameInput = (
    <Input
      id="basic-settings-name"
      type="text"
      value={dataSourceName}
      placeholder="Name"
      onChange={(event) => onNameChange(event.currentTarget.value)}
      required
      data-testid={selectors.pages.DataSource.name}
    ></Input>
  );

  return (
    <div className={styles.pageHeader}>
      <div className={styles.topRow}>
        <div className={styles.titleInfoContainer}>
          <div className={styles.title}>
            {navItem.img && <img className={styles.img} src={navItem.img} alt={`logo for ${navItem.text}`} />}
            {nameInput}
          </div>
          {info && <PageInfo info={info} />}
        </div>
        <div className={styles.actions}>{actions}</div>
      </div>
      <div className={styles.bottomRow}>
        {sub && <div className={styles.subTitle}>{sub}</div>}
        <AlertingEnabled enabled={alertingSupported} />
        <DefaultDataSourceSwitch isDefault={isDefault} onDefaultChange={onDefaultChange} />
      </div>
    </div>
  );
}

function AlertingEnabled({ enabled }: { enabled: boolean }) {
  return (
    <>
      {enabled ? (
        <Badge color="green" icon="check-circle" text="Alerting supported" />
      ) : (
        <Badge color="orange" icon="exclamation-triangle" text="Alerting not supported" />
      )}
    </>
  );
}

function DefaultDataSourceSwitch({ isDefault, onDefaultChange }: { isDefault: boolean; onDefaultChange: Function }) {
  return (
    <InlineField label="Default" labelWidth={8}>
      <InlineSwitch
        id="basic-settings-default"
        value={isDefault}
        onChange={(event: React.FormEvent<HTMLInputElement>) => onDefaultChange(event.currentTarget.checked)}
      />
    </InlineField>
  );
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    topRow: css({
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing(1, 2),
    }),
    bottomRow: css({
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing(1, 2),
    }),
    title: css({
      display: 'flex',
      flexDirection: 'row',
    }),
    actions: css({
      display: 'flex',
      flexDirection: 'row',
      gap: theme.spacing(1),
    }),
    titleInfoContainer: css({
      display: 'flex',
      label: 'title-info-container',
      flex: 1,
      flexWrap: 'wrap',
      gap: theme.spacing(1, 4),
      justifyContent: 'space-between',
      maxWidth: '100%',
    }),
    pageHeader: css({
      label: 'page-header',
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(1),
      marginBottom: theme.spacing(2),
    }),
    pageTitle: css({
      display: 'flex',
      marginBottom: 0,
    }),
    subTitle: css({
      position: 'relative',
      color: theme.colors.text.secondary,
    }),
    img: css({
      width: '32px',
      height: '32px',
      marginRight: theme.spacing(2),
    }),
  };
};
