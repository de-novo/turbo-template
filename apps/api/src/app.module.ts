import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AuthModule } from "./auth/auth.module.js";
import { DbModule } from "./db/db.module.js";
import { LoggerModule } from "./logger.module.js";
import { NotesModule } from "./notes/notes.module.js";

@Module({
	imports: [DbModule, LoggerModule, AuthModule, NotesModule],
	controllers: [AppController],
})
export class AppModule {}
