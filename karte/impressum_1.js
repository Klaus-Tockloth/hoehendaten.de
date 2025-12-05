document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        // Find the main navigation ul element
        const navUl = document.querySelector('nav.isNotMobile > ul');

        if (navUl) {
            // Create the new list item for "Impressum"
            const impressumLi = document.createElement('li');
            impressumLi.classList.add('dropdown');

            // Create the link element
            const impressumLink = document.createElement('a');
            impressumLink.href = '#';
            impressumLink.classList.add('dropbtn');
            impressumLink.textContent = 'Impressum';

            // Append the link to the list item
            impressumLi.appendChild(impressumLink);

            // Append the new list item to the navigation
            navUl.appendChild(impressumLi);

            // Add a click event listener to the "Impressum" link
            impressumLink.addEventListener('click', function(event) {
                event.preventDefault();
                displayImpressum();
            });
        } else {
            // Find the hamburger menu container
            const hamburgerContainer = document.getElementById('hamburger-content');

            if (hamburgerContainer) {
                // Create the new button for "Impressum"
                const impressumButton = document.createElement('button');
                impressumButton.classList.add('hamburger-menu-main-button');
                impressumButton.textContent = 'Impressum';

                // Append the new button to the hamburger menu
                hamburgerContainer.appendChild(impressumButton);

                // Add a click event listener to the "Impressum" button
                impressumButton.addEventListener('click', function(event) {
                    event.preventDefault();
                    displayImpressumInHamburgerMenu();
                });
            }
        }
    }, 0);

   
    // in customdata:   /*await*/ loadCustomData();
    // dann kann man oben in setTimeout auch auf 0 setzen

    function displayImpressum() {
        //fetch('https://hoehendaten.de/impressum.html')
        // Fetches 'impressum.html' from the root of the current server.
        fetch('/impressum.html')
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const navElement = doc.querySelector('nav');
                if (navElement) {
                    navElement.remove();
                }

                const modal = createModal(doc.body.innerHTML);
                document.body.appendChild(modal);
            })
            .catch(error => console.error('Error fetching impressum:', error));
    }

    function displayImpressumInHamburgerMenu() {
    //fetch('https://hoehendaten.de/impressum.html')
    // Fetches 'impressum.html' from the root of the current server.
    fetch('/impressum.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.text();
        })
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const navElement = doc.querySelector('nav');
            if (navElement) {
                navElement.remove();
            }

            // The 'createModal' function is assumed to be defined elsewhere in your code.
            const modal = createModal(doc.body.innerHTML);
            document.body.appendChild(modal);
        })
        .catch(error => console.error('Error fetching impressum:', error));
}


    function createModal(content) {
        // Create a modal container
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.style.zIndex = '1000';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';

        // Create the content container
        const modalContent = document.createElement('div');
        modalContent.style.position = 'relative';
        modalContent.style.backgroundColor = 'white';
        modalContent.style.padding = '20px';
        modalContent.style.borderRadius = '5px';
        modalContent.style.width = '80%';
        modalContent.style.height = '80%';
        modalContent.style.boxShadow = '0 4px 8px 0 rgba(0,0,0,0.2)';
        modalContent.style.overflowY = 'auto';

        // Create a close button
        const closeButton = document.createElement('span');
        closeButton.textContent = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '20px';
        closeButton.style.fontSize = '30px';
        closeButton.style.fontWeight = 'bold';
        closeButton.style.cursor = 'pointer';

        // Add click event to the close button
        closeButton.onclick = function() {
            document.body.removeChild(modal);
        };

        // Set the inner HTML of the modal content
        modalContent.innerHTML = content;
        modalContent.insertBefore(closeButton, modalContent.firstChild);

        // Append elements
        modal.appendChild(modalContent);

        // Close the modal if the user clicks outside of the content
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                document.body.removeChild(modal);
            }
        });

        return modal;
    }
});
