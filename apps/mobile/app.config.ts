import { projectConfig } from "@repo/config";

export default {
  expo: {
    name: `${projectConfig.projectName} Mobile`,
    orientation: "portrait",
    slug: `${projectConfig.projectSlug}-mobile`,
    userInterfaceStyle: "light",
    version: "0.0.0",
    web: {
      bundler: "metro",
      output: "static"
    }
  }
};
