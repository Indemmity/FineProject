/**
 * Pipeline API routes — REST endpoints for pipeline lifecycle management.
 */

import { Router, Request, Response } from "express";
import { createPipeline, getPipeline, transitionTo, listPipelines, PipelineState } from "../pipeline.js";
import { runFullPipeline } from "../workflows/full-pipeline.js";

export const pipelineRouter = Router();

// POST /api/pipeline/start — create and start a new pipeline
pipelineRouter.post("/start", async (req: Request, res: Response) => {
  const pipeline = createPipeline();
  const body = req.body as Record<string, unknown> | undefined;

  // Accept keywords and other data from request
  if (body?.keywords) {
    pipeline.data.keywords = body.keywords as string[];
  }
  if (body?.resumeId) {
    pipeline.data.resumeId = body.resumeId as string;
  }

  // Run the full workflow in background
  runFullPipeline(pipeline).catch((err) => {
    console.error(`[pipeline/${pipeline.pipelineId}] Workflow failed:`, err);
  });

  res.status(201).json({ pipelineId: pipeline.pipelineId, state: pipeline.state });
});

// GET /api/pipeline/:id — get full pipeline context
pipelineRouter.get("/:id", (req: Request, res: Response) => {
  const pipeline = getPipeline(req.params.id as string);
  if (!pipeline) {
    res.status(404).json({ error: "Pipeline not found" });
    return;
  }
  res.json(pipeline);
});

// POST /api/pipeline/:id/transition — move pipeline to next state
pipelineRouter.post("/:id/transition", (req: Request, res: Response) => {
  const { state, error } = req.body as { state?: PipelineState; error?: string };
  if (!state) {
    res.status(422).json({ error: "Missing 'state' in request body" });
    return;
  }
  try {
    const pipeline = transitionTo(req.params.id as string, state, error);
    res.json({ pipelineId: pipeline.pipelineId, state: pipeline.state });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// GET /api/pipeline/ — list all pipelines
pipelineRouter.get("/", (_req: Request, res: Response) => {
  res.json({ pipelines: listPipelines() });
});