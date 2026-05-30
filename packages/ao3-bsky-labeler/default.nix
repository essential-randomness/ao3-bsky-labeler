{
  lib,
  writeScriptBin,
  buildNpmPackage,
  nodejs_22,
  makeWrapper,
  ...
}:  let
  package-json = lib.importJSON (lib.snowfall.fs.get-file "package.json");
in
  buildNpmPackage {
    pname = "ao3-bsky-labeler";
    inherit (package-json) version;

    src = lib.snowfall.fs.get-file "/";

    npmDepsHash = "sha256-BF4lrGLCrqX5l+wuKveiqA4CV0YzoLhXjNfR1/66DSM=";

    nodejs = nodejs_22;

    dontNpmBuild = true;

    nativeBuildInputs = [makeWrapper];

    postInstall = ''
      makeWrapper ${nodejs_22}/bin/node $out/bin/ao3-bsky-labeler --add-flags $out/lib/node_modules/ao3-bsky-labeler/node_modules/.bin/tsx --add-flags $out/lib/node_modules/ao3-bsky-labeler/src/main.ts
      makeWrapper ${nodejs_22}/bin/node $out/bin/ao3-bsky-labeler-reconcile --add-flags $out/lib/node_modules/ao3-bsky-labeler/node_modules/.bin/tsx --add-flags $out/lib/node_modules/ao3-bsky-labeler/src/reconcile.ts --add-flags --apply --add-flags --actual-db
    '';
  }
