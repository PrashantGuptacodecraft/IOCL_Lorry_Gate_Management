import { Router } from "express";
import { auditRouter } from "../modules/audit/audit.routes.js";
import { authRouter } from "../modules/auth/auth.routes.js";
import { crewPassRouter } from "../modules/crewPass/crew-pass.routes.js";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes.js";
import { gateEntryRouter } from "../modules/gateEntry/gate-entry.routes.js";
import { masterRouter } from "../modules/master/master.routes.js";
import { reportRouter } from "../modules/reports/report.routes.js";
import { userRouter } from "../modules/users/user.routes.js";

export const apiRouter = Router();
apiRouter.use("/auth", authRouter);
apiRouter.use("/crew-passes", crewPassRouter);
apiRouter.use("/gate-entries", gateEntryRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/masters", masterRouter);
apiRouter.use("/reports", reportRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/audit-logs", auditRouter);
