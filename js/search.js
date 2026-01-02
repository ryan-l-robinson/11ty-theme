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

    // 8. Boost results based on date, then display
    const boostedResults = results.map(result => {
      const doc = idx.documentStore.docs[result.ref];
      if (!doc) return null;

      const newResult = {
        doc: doc,
        originalScore: result.score,
        newScore: result.score
      };

      if (doc.date) {
        const postDate = new Date(doc.date);
        const now = new Date();
        const ageInDays = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24);

				if (ageInDays >= 0) {
					// How heavily older posts get penalized.
					// For example, a decayRate of 0.001 means it would take about 337 days
					// for a post that is 5% more relevant to be ranked lower.
					const decayRate = 0.001;

					// How much the date factor can overcome relevance other.
					// i.e. a 0.3 scalingFactor will only overcome at most a 30% relevance score difference from the content.
					const scalingFactor = 0.3;

					// This can end up between 0 for a really old post and 1 for a brand new post.
					const dateBoost = Math.exp(-decayRate * ageInDays);

					// The boost can now be between 1 (no boost) and 1 + scalingFactor. This is why the scalingFactor can only overcome a certain amount of relevance.
          const boost = 1 + scalingFactor * dateBoost;
          newResult.newScore = result.score * boost;
        }
      }
      return newResult;
    }).filter(Boolean).sort((a, b) => b.newScore - a.newScore);

    // 9. Display the results
    searchResults.hidden = false;
		if (boostedResults.length > 0) {
			// Create a wrapper div for spacing.
			const wrapper = document.createElement('div');
			wrapper.classList.add('search-results-wrapper');

			// For accessibility, mark the region as expanded.
			searchInput.setAttribute('aria-expanded', 'true');
			// Start the list of results.
      const resultList = document.createElement('ul');

			// Heading for clarity and better navigation.
      const sr_heading = document.createElement('h2');
      sr_heading.textContent = `${boostedResults.length} Search Result${boostedResults.length === 1 ? '' : 's'} for "${query}"`;
      sr_heading.classList.add('search-results-heading');
      wrapper.appendChild(sr_heading);

			// Results added as list items.
      boostedResults.forEach(function (result) {
        const doc = result.doc;
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
