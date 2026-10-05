#!/bin/sh
# Publishes the documentation with mike, one version per minor release:
#
#   deploy.sh dev           the checked-out master, as "dev (unreleased)"
#   deploy.sh release TAG   the checked-out release: vX.Y.Z goes to vX.Y. The
#                           newest release becomes "latest", which is what
#                           visitors see first.
#
# Writes to the local gh-pages branch; set DOCS_PUSH=1 to push it as well.
set -eu

cd "$(dirname "$0")/../.."
push=""
if [ "${DOCS_PUSH:-}" = "1" ]; then
	push="--push"
fi

# The newest release tag, vX.Y.Z; pre-releases are left out.
newest_release() {
	git tag -l 'v*' | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -n 1
}

# GitHub Pages does not follow symbolic links, so aliases are redirects.
release() {
	tag=$1
	# a release candidate would take the place of the release it precedes
	if ! echo "$tag" | grep -qE '^v[0-9]+\.[0-9]+\.[0-9]+$'; then
		echo "Not a release: $tag - no docs published."
		return
	fi
	version=$(echo "$tag" | sed -E 's/^(v[0-9]+\.[0-9]+)\..*/\1/')
	if [ "$tag" = "$(newest_release)" ]; then
		mike deploy $push --alias-type=redirect --update-aliases --title "$version" "$version" latest
		mike set-default $push latest
	else
		# a fix for an older minor release only updates that one
		mike deploy $push --alias-type=redirect --title "$version" "$version"
	fi
}

case "${1:-}" in
dev)
	mike deploy $push --alias-type=redirect --update-aliases --title "dev (unreleased)" dev
	# until the first release, the site's root has nothing else to show
	if ! mike list latest >/dev/null 2>&1; then
		mike set-default $push dev
	fi
	;;
release)
	release "${2:?the release tag, e.g. v2.0.0}"
	;;
*)
	echo "usage: $0 dev | release TAG" >&2
	exit 2
	;;
esac
