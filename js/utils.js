const Utils = {
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    angle: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
    randomRange: (min, max) => Math.random() * (max - min) + min,
    getSpawnPos: (width, height, margin = 30) => {
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? -margin : width + margin;
            y = Math.random() * height;
        } else {
            x = Math.random() * width;
            y = Math.random() < 0.5 ? -margin : height + margin;
        }
        return { x, y };
    }
};
