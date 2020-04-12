var sItem = true;
var whitelist = ['ringsj', 'firecrackers', 'carrotsword', 'bunnyelixir', 'eslippers', 'hpamulet', 'hpbelt', 'wshield', 'coat1', 'wattire', 'pants', 'gloves'];

setInterval(function() {
    if (sItem) {
        sellItem()
    }
}, 1000 / 4); //Loop every 1/4 seconds.

function sellItem() {
    for (let i = 0; i < character.items.length; i++) {
        let c = character.items[i];
        if (c) {
            if (c && whitelist.includes(c.name)) {
                sell(i);
            }
        }
    }
}
