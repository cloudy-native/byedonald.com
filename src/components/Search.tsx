import { liteClient as algoliasearch } from "algoliasearch/lite";
import { InstantSearch, SearchBox } from "react-instantsearch";
import React from "react";

const appId = process.env.GATSBY_ALGOLIA_APP_ID;
const searchKey = process.env.GATSBY_ALGOLIA_API_KEY;
const indexName = process.env.GATSBY_ALGOLIA_INDEX_NAME;

console.log("Algolia", appId, searchKey, indexName);

const searchClient = appId && searchKey ? algoliasearch(appId, searchKey) : null;

console.log("Search Client", searchClient);

function Search() {
  if (!searchClient || !indexName) {
    return <div>Search is not implemented</div>;
  }

  return (
    <InstantSearch searchClient={searchClient} indexName={indexName}>
      <SearchBox />
    </InstantSearch>
  );
}

export default Search;
