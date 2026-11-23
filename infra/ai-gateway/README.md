# AI gateway (OmniRoute)

Nexus can send all its AI requests through a self-hosted, OpenAI-compatible
gateway such as [OmniRoute](https://github.com/cheaper-inference/OmniRoute)
(MIT licence). The gateway adds automatic fallback between providers, so a rate
limit or outage at one provider doesn't stop verification or grading.

## Privacy rule: read this first

Our Privacy Policy promises two things the gateway must keep true:

1. Requests only go to the providers it names (Groq, Google Gemini, OpenAI,
   Anthropic).
2. Only on API terms that forbid training on our data.

Many OmniRoute "free tier" providers **do** train on what you send, or keep it.
Candidate evidence must never reach them. Configure OmniRoute with only the
named providers, on their paid or no-training API terms, and turn off any
"free-tier radar" or automatic discovery that adds providers. To add a provider,
update the Privacy Policy first.

## Running it

OmniRoute needs an always-on server (it cannot run on Vercel). The free Oracle
server planned for the code runner works; see `infra/runner/README.md`.

1. Install OmniRoute on the server (Docker or npm, per its README) and put it
   behind HTTPS, like the runner.
2. In its dashboard, connect only the allowed providers and create a combo
   (for example `nexus`) that falls back between them.
3. Create an API key for Nexus.

## Connecting Nexus

In Vercel, set:

| Variable         | Value                                    | Type   |
| ---------------- | ---------------------------------------- | ------ |
| `AI_PROVIDER`    | `gateway`                                | Config |
| `AI_GATEWAY_URL` | `https://<your-gateway-host>/v1`         | Config |
| `AI_GATEWAY_KEY` | the key from step 3                      | Secret |
| `AI_MODEL`       | the combo or model name, e.g. `nexus`    | Config |

Then redeploy. To go back, set `AI_PROVIDER` to the previous provider.
