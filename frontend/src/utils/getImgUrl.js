function getImgUrl (name) {
    if (!name) {
        return "https://placehold.co/320x480?text=Book+Cover";
    }

    if (/^(https?:|data:|blob:)/i.test(name)) {
        return name;
    }

    if (name.includes("/") || name.includes("\\")) {
        return name;
    }

    return new URL(`../assets/books/${name}`, import.meta.url).href;
}

export {getImgUrl}
