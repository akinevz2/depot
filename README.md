# depot

The `system/` multi-project workspace (checked out at `~/development/system`).

**Public submodules** — the components deployed through `~/dots`:
[herbctl](https://github.com/akinevz2/herbctl),
[herbstutil](https://github.com/akinevz2/herbstutil),
[polyframes](https://github.com/akinevz2/polyframes),
[polytags](https://github.com/akinevz2/polytags),
[on-deploy](https://github.com/akinevz2/on-deploy).

Everything else (the prototyping directories) is gitignored and local
until finished. See `docs/architecture.md` for the structural and
logical maps.

## the thin-layer operating system

depot functions as a thin-layer OS on top of the user's existing operating
system (under development and testing on Windows 11 Pro with Ubuntu WSL):
it owns no kernel and no base system — it layers the window manager, the
deployment machinery and the orchestrated tools over what is already there,
and moves between hosts with the repos.
