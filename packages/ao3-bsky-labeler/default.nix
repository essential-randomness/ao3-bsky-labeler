{
  lib,
  writeScriptBin,
  buildNpmPackage,
  ...
}:  let
  package-json = lib.importJSON (lib.snowfall.fs.get-file "package.json");
in
  buildNpmPackage {
    pname = "ao3-bsky-labeler";
    inherit (package-json) version;

    src = lib.snowfall.fs.get-file "/";

    npmDepsHash = "sha256-XJZXwfHVxIZcK9VGEAdudwpfjdeXD/k9+FTILBed1Ok=";

    dontNpmBuild = true;
  }