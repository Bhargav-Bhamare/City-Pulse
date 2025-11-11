document.querySelectorAll(".upvote-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const id = btn.getAttribute("data-id");

    const res = await fetch(`/upvote/${id}`, {
      method: "POST"
    });

    const data = await res.json();
    if (data.success) {
      // update the count
      btn.querySelector(".upvote-count").textContent = data.upvotes;

      // 🔥 add "clicked" style directly with JS
      btn.style.backgroundColor = "#181612ff";  
      btn.style.color = "white";
      btn.style.transform = "scale(1.05)";
      btn.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";


      // disable further clicks (optional)
      btn.disabled = true;

      // small animation bounce effect
      setTimeout(() => {
        btn.style.transform = "scale(1)";
      }, 150);
    }
  });
});


// 🔍 SEARCH FUNCTIONALITY
const searchInput = document.getElementById("search");
if (searchInput) {
  searchInput.addEventListener("input", function () {
    const query = this.value.trim().toLowerCase();
    const posts = document.querySelectorAll(".post");
    let foundAny = false;

    posts.forEach(post => {
      const headingEl = post.querySelector("h2");
      const headingText = headingEl ? headingEl.textContent.toLowerCase() : "";

      // ✅ Corrected: added OR operator
      if (query === "" || headingText.startsWith(query)) {
        post.style.display = "flex";   // show
        foundAny = true;
      } else {
        post.style.display = "none";   // hide
      }
    });

    console.log("🔍 Search query:", query, "| Found any:", foundAny);

    // 🔄 filter map markers
    filterMarkers(query);
  });
}

// ✅ MAP FILTER
let allMarkers = [];

function displayPosts(postsData) {
  postMarkersLayer.clearLayers();
  allMarkers = [];

  postsData.forEach(post => {
    let lat = parseFloat(post.Lat);
    let lon = parseFloat(post.Lon);

    if (!isNaN(lat) && !isNaN(lon)) {
      // ✅ Fixed: backticks for template literal
      const marker = L.marker([lat, lon]).bindPopup(
        `<b>${post.heading || "Issue"}</b><br>${post.info || ""}<br><i>by ${post.user || "Anonymous"}</i>`
      );

      marker.heading = (post.heading || "").toLowerCase();
      allMarkers.push(marker);
      postMarkersLayer.addLayer(marker);
    }
  });
}

function filterMarkers(query) {
  postMarkersLayer.clearLayers();

  allMarkers.forEach(marker => {
    // ✅ Corrected: added OR operator
    if (query === "" || marker.heading.startsWith(query)) {
      postMarkersLayer.addLayer(marker);
    }
  });
}


