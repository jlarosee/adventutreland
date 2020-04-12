//
// Base v1
//
var attack_mode = true;
// var target_type = 'slime';
var mode = 1; //Standing still (will move if target is out of range) = 0, Front of target (Moves to front of target before attacking) = 1, Don't move at all (will not move even if target is out of range) = 2
// Movement //
var mtype = 'goo'; //Monster Type of the enemy you want to attack
// Preferred Monster [always keep '' around name] //
var mtype2 = 'goo'; //Monster Type of the enemy you want to attack if you can't find the first
// Alternate Monster [always keep '' around name] //

var angle = null;
var lines_drawn = 0;
var max_lines = 5;


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
        target = get_closest_monster({
            m_type_priority: mtype,
            m_type_secondary: mtype2,
            targeting_mode: mode,
            no_attack: true,
            path_check: true
        });
        if (mode == 2 && target && !in_attack_range(target)) {
            target = null;
        }
        if (target) {
            change_target(target);
        } else {
            set_message("No Monsters");
            return;
        }
    }

    // game_log("Range delta: " + character.range + " <> " + parent.distance(character, target));

    if(can_attack(target)) {
        set_message("Attacking");
        attack(target);
    }

    // if(! is_in_range(target)) {
    //     game_log("Not in range... ");
    //     var move_to_x = target.real_x - character.range;
    //     var move_to_y = target.real_y - character.range;
    //     game_log("move to: " + move_to_x + ", " + move_to_y);
    //     draw_line(character.x, character.y , move_to_x, move_to_y, 2, 0xffff00);
    //     lines_drawn++;
    //     move(
    //         move_to_x,
    //         move_to_y
    //     );
    // }

    if(lines_drawn > max_lines) {
        lines_drawn = 0;
        clear_drawings();
    }

},1000 / 4);

setInterval(function () {
    var target = get_targeted_monster();
    //Following/Maintaining Distance
    if (mode == 0) {

        // Done move

    } else if (mode == 1) {
        if (
            target &&
            ! in_attack_range(target)
        ) {
            game_log("moving towards")
            move(
                character.real_x + (target.real_x - character.real_x) * .4,
                character.real_y + (target.real_y - character.real_y) * .4
            );
        }

        if (
            target &&
            parent.distance(character, target) < (character.range / 2)
        ) {
            game_log("moving away")
            move(
                character.real_x - (target.real_x - character.real_x) * .1,
                character.real_y - (target.real_y - character.real_y) * .1
            );
        }
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

//Custom m_type targetting
function get_closest_monster(args) {
//args:
//m_type_priority - the monster you want to attack (bosses)
//m_type_secondary - the monster you attack when your boss is not there
//target: Only return monsters that target this "name" or player object
var min_d = 999999,
target = null;
var mode = -1;
if (args.targeting_mode) {
    mode = args.targeting_mode
    if (mode == 2) min_d = character.range;
}
if (args.m_type_priority == null && args.m_type_secondary == null) return null;
if (args && args.target && args.target.name) args.target = args.target.name;
for (id in parent.entities) {
    var current = parent.entities[id];
    if (current.type != "monster" || current.dead || (current.target && current.target != character.name)) continue;
    if (args.no_target && current.target && current.target != null && current.target != character.name) continue;
    if (args.path_check && !can_move_to(current)) continue;
    var c_dist = parent.distance(character, current);
    if (current.mtype == args.m_type_priority) {
        if (mode != 2) return current;
        else if (mode == 2 && c_dist < character.range) return current;
    } else if (c_dist < min_d && current.mtype == args.m_type_secondary) {
        min_d = c_dist;
        target = current;
    }
}
return target;
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
