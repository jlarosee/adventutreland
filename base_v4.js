//
// Base v4:
// Better movement (parabolic movement; unstuck)

var attack_mode = true;
// 0 Don't move at all (will not move even if target is out of range)
// 1 Standing still (will move if target is out of range),
// 2 Front of target (Moves to front of target before attacking),
var mode = 1;
var passive = true;
var mtype = 'croc'; //Monster Type of the enemy you want to attack
var angle = null;
var direction = 1;
var lines_drawn = 0;
var max_lines = 5;
// Ranger: 20
// Mage: 100??
var class_distance_offset = 20;


setInterval(function(){
    use_hp_or_mp();
    loot();

    if(
        ! attack_mode ||
        character.rip ||
        is_moving(character)
    ) return;

    var target = get_targeted_monster();

    if (! target ||
        (target.target && target.target != character.name)
    ) {
        target = get_nearest_monster({'type': mtype});

        if (target) {
            change_target(target);
            // var diff_x = character.real_x - target.real_x;
            // var diff_y = character.real_y - target.real_y;
            // angle = Math.atan2(diff_y, diff_x);
        } else {
            set_message("No Monsters");
            return;
        }
    }

    // game_log("Range delta: " + character.range + " <> " + parent.distance(character, target));

    if(can_attack(target) && ! passive) {
        set_message("Attacking");
        attack(target);
        clear_drawings();
    }

},1000 / 4);

/**
 * Movement
 */
setInterval(function () {
    var target = get_targeted_monster();

    if(can_attack(target)) {
        set_message("Attacking");
        attack(target);
    }
    //Following/Maintaining Distance
    if (mode == 0) {

        // Done move

    } else if (mode == 1) {
        if (
            target &&
            ! is_in_range(target)
        ) {
            var half_x_dist = ((target.x - character.x) / 2);
            var half_y_dist = ((target.y - character.y) / 2);
            var move_to_x = character.x + half_x_dist - class_distance_offset;
            var move_to_y = character.y + half_y_dist - class_distance_offset;
            moveTo(move_to_x, move_to_y, 0x00ff00, 'Moving towards ' + target.name);
        }

        if (
            target &&
            parent.distance(character, target) < (character.range / 2)
        ) {
            // Linear (prone to getting very stuck)
            // var move_to_x = character.real_x - (target.real_x - character.real_x) / 2;
            // var move_to_y = character.real_y - (target.real_y - character.real_y) / 2;
            // var msg = 'Move away from ' + target.name;
            // var color = 0xff0000;

            if(is_moving(character)) return;

            // From pve_combat_script.js, uses angle after target
            var diff_x = character.real_x - target.real_x;
            var diff_y = character.real_y - target.real_y;
            angle = Math.atan2(diff_y, diff_x);
            angle = angle + ((Math.PI * 2) * 0.1) * direction;
            // angle = ((Math.PI * 2) * 0.1);
            game_log('angle: ' + angle);
            var move_to_x = target.real_x + character.range * Math.cos(angle);
            var move_to_y = target.real_y + character.range * Math.sin(angle);
            var msg = 'Move away from ' + target.name;
            var color = 0xfff000;

            // Flip
            if(! can_move_to(move_to_x, move_to_y)) {
                game_log("Flip direction...");
                direction = direction * -1;
            }


            moveTo(move_to_x, move_to_y, color, msg);
            draw_line(character.real_x, character.real_y , move_to_x, move_to_y, 2, 0x00ff00);
            lines_drawn++;
            // if(! can_move_to(move_to_x, move_to_x)) {
            //     var diff_x = character.real_x - target.real_x;
            //     var diff_y = character.real_y - target.real_y;
            //     angle = Math.atan2(diff_x, diff_y);
            //     game_log('find an angle: ' + angle);
            //     var move_to_x = target.real_x + character.range * Math.cos(angle);
            //     var move_to_y = target.real_y + character.range * Math.sin(angle);

            //     moveTo(move_to_x, move_to_y, 0xff0000, 'Moving at new angle: ' + angle);
            // } else {
            //     moveTo(move_to_x, move_to_y, 0xff0000, 'Move away from ' + target.name);
            // }

        }
    } else if (mode = 2) {
        //  Move to target
    }

    if(lines_drawn > max_lines) {
        lines_drawn = 0;
        clear_drawings();
    }

    //Heal and restore mana if required
    if (character.hp / character.max_hp < 0.4 && new Date() > parent.next_potion) {
        parent.use('hp');
        if (character.hp <= 100) {
            parent.socket.emit("transport", {
                to: "main"
            });
        }
    }

    if (character.mp / character.max_mp < 0.3 && new Date() > parent.next_potion) {
        parent.use('mp');
    }

}, 250); //Loop every 250 milliseconds

function moveTo(x, y, color, msg) {
    // Line
    draw_line(character.x, character.y , x, y, 1, color);
    lines_drawn++;
    // Angle change
    // Log
    game_log(msg);
    move(x, y);
    // } else {
    //     // If target changed, calculate the angle between it and you
    //     x = x + 20;
    //     y = y + 20;
    //     angle = Math.atan2(x, y);
    //     new_x = x * Math.cos(angle) - y * Math.sin(angle);
    //     new_y = y * Math.cos(angle) + x * Math.sin(angle);
    //     game_log("STUCK..");
    //     // Line
    //     draw_line(character.x, character.y , new_x, new_y, 1, 0xfff000);
    //     lines_drawn++;
    //     move(x, y);
    // }
}

setInterval(function() {
  update_xptimer();
}, 1000 / 4);

var minute_refresh; // how long before the clock resets
function init_xptimer(minref) {
    minute_refresh = minref || 1;
    parent.add_log(minute_refresh.toString() + ' min until tracker refresh!', 0x00FFFF);
    let $ = parent.$;
    let brc = $('#bottomrightcorner');
    brc.find('#xptimer').remove();
    let xpt_container = $('<div id="xptimer"></div>').css({
        background: 'black',
        border: 'solid gray',
        borderWidth: '5px 5px',
        width: '320px',
        height: '96px',
        fontSize: '28px',
        color: '#77EE77',
        textAlign: 'center',
        display: 'table',
        overflow: 'hidden',
        marginBottom: '-5px'
    });
    //vertical centering in css is fun
    let xptimer = $('<div id="xptimercontent"></div>')
        .css({
          display: 'table-cell',
          verticalAlign: 'middle'
        })
        .html('Estimated time until level up:<br><span id="xpcounter" style="font-size: 40px !important; line-height: 28px">Loading...</span><br><span id="xprate">(Kill something!)</span>')
        .appendTo(xpt_container);

    brc.children().first().after(xpt_container);
}

var last_minutes_checked = new Date();
var last_xp_checked_minutes = character.xp;
var last_xp_checked_kill = character.xp;
// lxc_minutes = xp after {minute_refresh} min has passed, lxc_kill = xp after a kill (the timer updates after each kill)
function update_xptimer() {
    if (character.xp == last_xp_checked_kill) return;
    let $ = parent.$;
    let now = new Date();
    let time = Math.round((now.getTime() - last_minutes_checked.getTime()) / 1000);
    if (time < 1) return; // 1s safe delay
    let xp_rate = Math.round((character.xp - last_xp_checked_minutes) / time);
    if (time > 60 * minute_refresh) {
        last_minutes_checked = new Date();
        last_xp_checked_minutes = character.xp;
    }
    last_xp_checked_kill = character.xp;
    let xp_missing = parent.G.levels[character.level] - character.xp;
    let seconds = Math.round(xp_missing / xp_rate);
    let minutes = Math.round(seconds / 60);
    let hours = Math.round(minutes / 60);
    let counter = `${hours}h ${minutes % 60}min`;
    $('#xpcounter').text(counter);
    $('#xprate').text(`${ncomma(xp_rate)} XP/s`);
}

function ncomma(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

init_xptimer(5)

/**
 * Snippets
 */
map_key("DOT", {
    "name":"pure_eval",
    "code":"ping()",
    keycode:190
});
