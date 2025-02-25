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

    npmDepsHash = "sha256-XJZXwfHVxIZcK9VGEAdudwpfjdeXD/k9+FTILBed1Ok=";

    nodejs = nodejs_22;

    dontNpmBuild = true;

    nativeBuildInputs = [makeWrapper];

    postInstall = ''
      makeWrapper ${nodejs_22}/bin/node $out/bin/ao3-bsky-labeler --add-flags $out/lib/node_modules/ao3-bsky-labeler/node_modules/.bin/tsx --add-flags $out/lib/node_modules/ao3-bsky-labeler/src/main.ts
    '';
  }