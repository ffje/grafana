// Code generated - EDITING IS FUTILE. DO NOT EDIT.
//
// Generated by:
//     public/app/plugins/gen.go
// Using jennies:
//     TSTypesJenny
//     LatestMajorsOrXJenny
//
// Run 'make gen-cue' from repository root to regenerate.

export interface PanelOptions extends common.SingleStatBaseOptions {
  showThresholdLabels: boolean;
  showThresholdMarkers: boolean;
}

export const defaultPanelOptions: Partial<PanelOptions> = {
  showThresholdLabels: false,
  showThresholdMarkers: true,
};
