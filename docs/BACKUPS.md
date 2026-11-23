# Database backups

Two layers protect the data:

1. **Neon's own history.** Neon keeps recent changes and can restore the
   database to an earlier moment (Neon console → your project → Restore).
   How far back depends on the Neon plan.
2. **Nightly encrypted backups** (`.github/workflows/backup.yml`). Every day
   at 07:17 UTC GitHub Actions dumps the whole production database, encrypts
   it with your passphrase (AES-256) and keeps it for 30 days. If an S3 bucket
   is set, a copy also goes there (give the bucket a 30-day expiry rule, see
   below).

## Turning backups on

In GitHub: the repository → **Settings → Secrets and variables → Actions →
New repository secret**. Add:

| Name                  | What to paste                                                                                        | Type   |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| `BACKUP_DATABASE_URL` | Neon's **direct** (non-pooled) connection string for production                                      | Secret |
| `BACKUP_PASSPHRASE`   | A long random passphrase. Save a copy in a password manager: without it the backups can't be opened. | Secret |

Optional S3 copy: `BACKUP_S3_BUCKET`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (use a bucket that isn't public). In
the bucket's Management tab add a lifecycle rule that deletes `db-backups/`
after 30 days: the privacy policy promises backups are gone within 30 days.

Then **Actions → Nightly database backup → Run workflow** once to check it
works. A green run with a file under "Artifacts" means it's working.

## Restoring

You need PostgreSQL 17 tools (`pg_restore`), GnuPG, and the passphrase.

1. Download the backup: Actions → Nightly database backup → pick a run →
   Artifacts. Unzip it to get `nexus-db-<date>.dump.gpg`.
2. Decrypt it (asks for the passphrase):

   ```sh
   gpg --output nexus.dump --decrypt nexus-db-<date>.dump.gpg
   ```

3. Restore into a **new, empty** database first (a new Neon branch is
   easiest), never straight over production:

   ```sh
   pg_restore --no-owner --no-privileges --dbname "<new database URL>" nexus.dump
   ```

4. Check the data looks right (sign in against it locally with
   `DATABASE_URL` pointing at it). Then either point Vercel's `DATABASE_URL`
   at the restored database, or copy the rows you need back.
5. Delete `nexus.dump` from your computer when you're done: it isn't
   encrypted.

## Testing a restore

Restore into a scratch Neon branch every few months, so you know the backups
work before you need them.
