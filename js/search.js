(function () {
    // 1. Define the search form, input, and results elements
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    if (!searchInput || !searchResults || !searchForm) {
        return;
    }

    // 2. Set up our data store and lunr index
    let documents = [];
    let idx;

    // 3. Fetch the search index
    fetch('/search-index.json')
        .then(response => response.json())
        .then(docs => {
            documents = docs;
            // 4. Initialize lunr.js with the fields we want to search
            idx = lunr(function () {
                this.ref('url');
                this.field('title', { boost: 10 });
                this.field('content');

                // 5. Add the documents from the JSON file to the index
                documents.forEach(function (doc) {
                    this.add(doc);
                }, this);
            });
        }).catch(err => {
            console.error('Error fetching or parsing search index:', err);
            if(searchForm) searchForm.style.display = 'none';
        });

    // 6. Handle search form submission
    const performSearch = (event) => {
        // a11y: allow enter key to submit without reloading page
        if (event) {
          event.preventDefault();
        }
        
        const query = searchInput.value;

        // 7. Clear previous results
        searchResults.innerHTML = '';

        if (!query || !idx) {
            return;
        }

        // 8. Perform the search
        const results = idx.search(query);

        // 9. Display the results
        if (results.length > 0) {
            const resultList = document.createElement('ul');
            results.forEach(function (result) {
                const doc = documents.find(d => d.url === result.ref);
                if (doc) {
                    const listItem = document.createElement('li');
                    const link = document.createElement('a');
                    link.href = doc.url;
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
