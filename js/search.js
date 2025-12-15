(function () {
    // 1. Define the search form, input, and results elements
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    if (!searchInput || !searchResults || !searchForm) {
        return;
    }

    // 2. Set up our elasticlunr index
    let idx;

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

        if (!query || !idx) {
            return;
        }

        // 7. Perform the search
        const results = idx.search(query, {
            fields: {
                title: { boost: 10 },
                description: { boost: 5 },
                tags: { boost: 3 }
            },
            expand: true // Search within phrases
        });

        // 8. Display the results
        if (results.length > 0) {
            const resultList = document.createElement('ul');
            results.forEach(function (result) {
                // Since we used saveDocument(true), the doc is stored in the result
                const doc = result.doc;
                if (doc) {
                    const listItem = document.createElement('li');
                    const link = document.createElement('a');
                    link.href = doc.id; // The 'id' is the URL
                    link.textContent = doc.title;
                    listItem.appendChild(link);
                    resultList.appendChild(listItem);
                }
            });
            searchResults.appendChild(resultList);
        } else {
            const noResultsMessage = document.createElement('p');
            noResultsMessage.textContent = 'No results found.';
            searchResults.appendChild(noResultsMessage);
        }
    };

    const handleInput = () => {
      // a11y: let screen readers know results are updating
      searchResults.setAttribute('aria-live', 'polite');

      // Simple debounce
      setTimeout(() => {
        if (searchInput.value.trim() !== '') {
          performSearch();
        } else {
          searchResults.innerHTML = '';
        }
      }, 200);
    }

    searchForm.addEventListener('submit', performSearch);
    searchInput.addEventListener('keyup', handleInput);
})();
