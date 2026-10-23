CREATE TABLE IF NOT EXISTS idea_drawings (
  idea_id text PRIMARY KEY NOT NULL REFERENCES ideas(id),
  image_data text NOT NULL,
  revision text NOT NULL
);
