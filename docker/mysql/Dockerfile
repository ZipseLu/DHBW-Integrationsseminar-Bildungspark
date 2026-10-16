# =============================================================================
# MySQL 8.4 mit projekt-Spezifischer Konfiguration.
#
# Warum ein eigenes Image statt eines Bind-Mounts auf /etc/mysql/conf.d?
#
#   MySQL ignoriert world-writable Konfigurationsdateien:
#     "[Warning] World-writable config file ... is ignored."
#   Unter Docker Desktop fuer Windows landen Bind-Mounts mit 777-Rechten,
#   die Einstellungen wuerden also stillschweigend verworfen.
#
#   Im Image ist die Datei Teil des Layers und hat korrekte 644-Rechte.
# =============================================================================
FROM mysql:8.4

COPY conf.d/bildungspark.cnf /etc/mysql/conf.d/bildungspark.cnf

RUN chmod 644 /etc/mysql/conf.d/bildungspark.cnf
