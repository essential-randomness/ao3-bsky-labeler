{
    # Snowfall Lib provides a customized `lib` instance with access to your flake's library
    # as well as the libraries available from your flake's inputs.
    lib,
    # An instance of `pkgs` with your overlays and packages applied is also available.
    pkgs,
    # You also have access to your flake's inputs.
    inputs,

    # Additional metadata is provided by Snowfall Lib.
    namespace, # The namespace used for your flake, defaulting to "internal" if not set.
    system, # The system architecture for this host (eg. `x86_64-linux`).
    target, # The Snowfall Lib target for this system (eg. `x86_64-iso`).
    format, # A normalized name for the system target (eg. `iso`).
    virtual, # A boolean to determine whether this system is a virtual target using nixos-generators.
    systems, # An attribute map of your defined hosts.

    # All other arguments come from the module system.
    config,
    ...
}:
let
    inherit (builtins) toString;
    inherit (lib) types mkIf mkOption mkDefault;
    inherit (lib) optional optionals optionalAttrs optionalString;

in {
    options.services.ao3-bsky-labeler = {
        enable =
            lib.mkEnableOption "A labeler for AO3 tags"; 

        host = mkOption {
            type = types.str;
            description = "The public host name to serve.";
            example = "example.com";
        };

        port = mkOption {
            type = types.port;
            default = 4105;
            description = "The port the labeler should listen on.";
        };

        signingKeyFile = mkOption {
            ##
            # DO NOT USE types.path! It pulls the file into the Nix Store and
            # this should stay a secret no one but us knows.
            ##
            type = types.str;
            description = ''
              Path to a file containing the private signing key for the labeler.
            '';
        };

        stateDir = mkOption {
            type = types.str;
            default = "/var/lib/ao3-bsky-labeler";
            description = ''
                Where the database and cursor will be saved.
            '';
        };

        user = mkOption {
            type = types.str;
            default = "ao3-bsky-labeler";
            description = "User under which ao3-bsky-labeler is ran.";
        };

        group = mkOption {
            type = types.str;
            default = "ao3-bsky-labeler";
            description = "Group under which ao3-bsky-labeler is ran.";
        };
    };
  
    config = mkIf cfg.enable {
        users = {
            users = optionalAttrs (cfg.user == "ao3-bsky-labeler") {
                ao3-bsky-labeler = {
                    group = cfg.group;
                    home = cfg.stateDir;
                    isSystemUser = true;
                };
            };

            groups =
                optionalAttrs (cfg.group == "ao3-bsky-labeler") { ao3-bsky-labeler = { }; };
        };

        systemd.services.ao3-bsky-labeler = {
            after = [ "network.target" ];
            wantedBy = [ "multi-user.target" ];

            serviceConfig = {
                Type = "simple";
                User = cfg.user;
                Group = cfg.group;
                WorkingDirectory = cfg.stateDir;
                Restart = "always";
                RestartSec = 20;
            };

            environment = {
                PORT = cfg.port;
            };

            # this is where we can write a bash script to do everything we need 
            script = ''
                if ! test -f "${cfg.signingKeyFile}"; then
                  echo "Your signing key file is missing!"
                  exit 1
                fi

                export SIGNING_KEY="$(cat ${cfg.signingKeyFile})"
                exec ${cfg.package}/bin/ao3-bsky-labeler
            '';
        };

        services.nginx.virtualHosts."${cfg.host}" = {
            enableACME = true;
            forceSSL = true;
        
            locations."/" = {
                proxyWebsockets = true;
                proxyPass = "http://127.0.0.1:${toString cfg.port}";
            };
        }; 
    }
}