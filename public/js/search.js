const input = document.getElementById("searchInput");
const suggestionsBox = document.getElementById("suggestions");

if (input) {
  input.addEventListener("input", async () => {
    let query = input.value;

    if (query.length < 1) {
      suggestionsBox.innerHTML = "";
      return;
    }

    let res = await fetch(`/listings/suggestions?q=${query}`);
    let data = await res.json();

    suggestionsBox.innerHTML = "";

    data.forEach((title) => {
      let item = document.createElement("a");
      item.classList.add("list-group-item", "list-group-item-action");
      item.textContent = title;

      item.addEventListener("click", () => {
        input.value = title;
        suggestionsBox.innerHTML = "";
      });

      suggestionsBox.appendChild(item);
    });
  });
}
