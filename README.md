# depot

The project is striving to grow into a fully-fledged operating system with modular architecture.

**Public submodules** — the components deployed through `~/dots`:
[herbctl](https://github.com/akinevz2/herbctl),
[herbstutil](https://github.com/akinevz2/herbstutil),
[polyframes](https://github.com/akinevz2/polyframes),
[polytags](https://github.com/akinevz2/polytags),
[on-deploy](https://github.com/akinevz2/on-deploy).

Since 2026-11 these are **symlinks into the dots checkouts**, not
depot submodules (`herbctl` → `~/dots/herbctl/.local/share/herbctl`,
… — one working tree per project; the gitlinks and `.gitmodules`
entries were retired). A fresh machine recreates them after `~/dots`
is cloned and `make depends` has initialized its submodules:

```sh
for p in herbctl herbstutil on-deploy polyframes polytags; do
    ln -s "$HOME/dots/$p/.local/share/$p" "$HOME/development/system/$p"
done
```

`publish-dots.sh` step 4 verifies/repairs the links on every publish
run — a missing link is self-healed there.

Everything else (the prototyping directories) is gitignored and local
until finished. See `docs/architecture.md` for the structural and
logical maps.

## the thin-layer operating system

depot functions as a thin-layer OS on top of the user's existing operating
system (under development and testing on Windows 11 Pro with Ubuntu WSL):
it owns no kernel and no base system — it layers the window manager, the
deployment machinery and the orchestrated tools over what is already there,
and moves between hosts with the repos.
