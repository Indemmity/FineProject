/**
 * Pipeline Orchestrator — manages cross-service workflows for the job platform.
 *
 * Entry point: Express server with health check and pipeline API routes.
 * In P4 this will coordinate: search → select → upload → analyze → tailor → guardrail → outreach
 */

import express from "express";
import { pipelineRouter } from "./routes/pipeline.js";

const app = express();
const PORT = parseInt(process.env.PORT || "8100", 10);

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "healthy", service: "orchestrator" });
});

// Pipeline API routes
app.use("/api/pipeline", pipelineRouter);

app.listen(PORT, () => {
  console.log(`Orchestrator service running on port ${PORT}`);
});

export default app;