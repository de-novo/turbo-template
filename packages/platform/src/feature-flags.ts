export const featureFlags = {
  exampleFeature: "example-feature",
} as const;

export type FeatureFlag = (typeof featureFlags)[keyof typeof featureFlags];

export type FeatureFlagState = Partial<Record<FeatureFlag, boolean>>;
