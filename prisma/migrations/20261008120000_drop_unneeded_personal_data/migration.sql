-- Data minimisation (see docs/PRIVACY_AUDIT.md).
-- IRREVERSIBLE: permanently deletes the stored values. Take a backup first if
-- you need one for any reason.
--
-- AIAnalysis.rawResponse held the AI provider's full response "for debugging";
-- the app only needs the parsed score/explanation/suggestions.
ALTER TABLE "AIAnalysis" DROP COLUMN IF EXISTS "rawResponse";

-- OAuthConnection tokens were stored in plaintext and never used after sign-in.
ALTER TABLE "OAuthConnection" DROP COLUMN IF EXISTS "accessToken";
ALTER TABLE "OAuthConnection" DROP COLUMN IF EXISTS "refreshToken";
