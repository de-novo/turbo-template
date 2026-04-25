import projectConfigJson from "../../../project.config.json" with {
	type: "json",
};

export type ProjectConfig = {
	projectName: string;
	projectSlug: string;
	packageScope: string;
	projectTimezone: string;
};

export const projectConfig: ProjectConfig = projectConfigJson;
