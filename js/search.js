(function () {
  // 1. Define the search form, input, and results elements
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  if (!searchInput || !searchResults || !searchForm) {
    return;
  }

  // Accessibility: let screen readers know results are updating
  searchResults.setAttribute('aria-live', 'polite');

  // 2. Set up our elasticlunr index
  let idx;
  let debounceTimer;

  // 3. Fetch the search index
  fetch('/search-index.json')
    .then(response => response.json())
    .then(indexData => {
  	  // 4. Load the pre-built elasticlunr index
      idx = elasticlunr.Index.load(indexData);
    }).catch(err => {
      console.error('Error fetching or parsing search index:', err);
      if(searchForm) searchForm.style.display = 'none';
    });

  // 5. Handle search form submission
  const performSearch = (event) => {
    // a11y: allow enter key to submit without reloading page
    if (event) {
      event.preventDefault();
    }

  	const query = searchInput.value;

  	// 6. Clear previous results
    searchResults.innerHTML = '';
    searchInput.setAttribute('aria-expanded', 'false');
    searchResults.hidden = true;

    if (!query || !idx) {
      return;
    }

    // 7. Perform the search
    const results = idx.search(query, {
      fields: {
        title: { boost: 10 },
				tags: { boost: 5 },
				description: { boost: 3 },
        content: { boost: 1 }
      },
      expand: true // Search within phrases
    });

    // 8. Display the results
    searchResults.hidden = false;
		if (results.length > 0) {
			// Create a wrapper div for spacing.
			const wrapper = document.createElement('div');
			wrapper.classList.add('search-results-wrapper');

			// For accessibility, mark the region as expanded.
			searchInput.setAttribute('aria-expanded', 'true');
			// Start the list of results.
      const resultList = document.createElement('ul');

			// Heading for clarity and better navigation.
      const sr_heading = document.createElement('h2');
      sr_heading.textContent = `${results.length} Search Result${results.length === 1 ? '' : 's'} for "${query}"`;
      sr_heading.classList.add('search-results-heading');
      wrapper.appendChild(sr_heading);

			// Results added as list items.
      results.forEach(function (result) {
        const doc = idx.documentStore.docs[result.ref];
				if (doc) {
					// Create a list item for each result
					const listItem = document.createElement('li');
          const link = document.createElement('a');
          link.href = doc.id; // The 'id' is the URL
          link.textContent = doc.title;
          listItem.appendChild(link);

          const description = document.createElement('p');
          if (doc.description) {
            description.textContent = doc.description;
					}
					else {
						description.textContent = "No description available."
					}
          listItem.appendChild(description);

					resultList.appendChild(listItem);
        }
			});

			wrapper.appendChild(resultList);
      searchResults.appendChild(wrapper);
		}
		else {
      const noResultsMessage = document.createElement('p');
      noResultsMessage.textContent = 'No results found.';
      searchResults.appendChild(noResultsMessage);
    }
  };

	// Don't update until 500ms of inactivity, to avoid overwhelming screen reader users.
  const handleInput = () => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      if (searchInput.value.trim() !== '') {
  	    performSearch();
			}
			else {
        searchResults.innerHTML = '';
        searchResults.hidden = true;
        searchInput.setAttribute('aria-expanded', 'false');
      }
    }, 500);
  }

  searchForm.addEventListener('submit', performSearch);
  searchInput.addEventListener('input', handleInput);
})();
