import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import organizationsRouter from "./organizations";
import billingRouter from "./billing";
import subgraphsRouter from "./subgraphs";
import dashboardRouter from "./dashboard";
import activityRouter from "./activity";
import alertsRouter from "./alerts";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/organizations", organizationsRouter);
router.use("/billing", billingRouter);
router.use("/subgraphs", subgraphsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/activity", activityRouter);
router.use("/alerts", alertsRouter);
router.use("/search", searchRouter);

export default router;
