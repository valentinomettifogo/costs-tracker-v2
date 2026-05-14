/**
 * Builds the URL for toggling a tag filter.
 * Clicking an already-active tag removes the filter; any other tag sets it.
 */
export function buildTagFilterHref(
	tag: string,
	currentTag: string | null,
	filterQueryString: string,
	resetHref = '/'
): string {
	const params = new URLSearchParams(filterQueryString);
	if (currentTag === tag) {
		params.delete('tag');
	} else {
		params.set('tag', tag);
	}
	const qs = params.toString();
	return qs ? `?${qs}` : resetHref;
}
