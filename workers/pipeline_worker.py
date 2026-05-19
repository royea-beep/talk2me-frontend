"""Empire Pipeline Worker - GitHub Actions, every 2 min.
Polls Empire HQ pipeline_runs WHERE state=queued, processes by pipeline_type.
Bot_task: 55e2c212-b2e3-4652-a6d4-22c7c2f3da70
"""

# TODO bot_task 55e2c212: Body of worker not yet written here. The orchestrator
# half (pipeline_runs table, pipeline-enqueue EF, ig-reel-extract proxy,
# telegram-webhook v8 with IG URL detection + continue callbacks) IS deployed.
# This file just needs the ~250-line Python body added by the next session.
# Reference implementation: the IG analyzer flow that succeeded for bot_task
# 44e58768 (instaloader fetch + anthropic vision tool_use + LeadMachine insert).
