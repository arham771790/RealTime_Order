import { Router } from "express";

import healthRouter from "./routes/health.routes.js";

const router = Router();

router.use(healthRouter);

export default router;
