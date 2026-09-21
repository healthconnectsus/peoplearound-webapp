-- 0068 — the upload rules move from the browser to the bucket.
--
-- Both upload paths (PhotoPicker for project photos, PhotoUploads for the
-- avatar and cover) refuse anything that is not an image or is over 5 MB.
-- But they refuse it in JavaScript, and the buckets themselves were created
-- (0010, 0021) with no limit of their own. The storage API is reachable by
-- anyone holding a session — it has to be, the browser uploads straight to
-- it — so the real limit was the project-wide one: any file type, 50 MB a
-- piece, into a public bucket, served from our egress.
--
-- That is a cost exposure rather than a data one. Storage and egress are the
-- two Supabase line items that scale with what people put in, and a signed-up
-- account could have used the public bucket as free hosting for anything.
--
-- The numbers are the client's own, deliberately: 5 MB and image/*. The
-- browser downscales before upload (src/lib/image.ts) and in practice sends a
-- few hundred kilobytes, but shrinkImage() returns the original file when it
-- cannot decode it, so the ceiling has to be the pre-shrink one or a photo
-- the form accepted could be refused by the server. With these values nothing
-- the UI allows is rejected; only requests that bypass the UI are.
--
-- This is a ceiling per file, not a quota per person. Someone determined can
-- still upload many 5 MB images. A per-user quota is a product decision
-- (how many photos may one neighbor have?) and is not made here.
--
-- Idempotent: a plain UPDATE to the same values.

update storage.buckets
   set file_size_limit    = 5242880,           -- 5 MB, = MAX_BYTES in both upload components
       allowed_mime_types = array['image/*']   -- = file.type.startsWith("image/")
 where id in ('profiles', 'projects');
