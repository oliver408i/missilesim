
function showHelp() {
    alert("Welcome to Missile Sim Game (name TBD)!\n\nApologies for the currently bad help menu, it is to be changed\n\nIf you know the context behind this game, then all you need to know is that WASD are the controls (Space to explode when you are near the target) and you are the missile!\n\nYou probably know what a missile is, a guided projectile launched from fighter jets to shoot down enemy planes.\nA good portion of Air to Air missiles these days are so called IR missile. Essentially, they track the heat of enemy planes (namely, the engines), and home in on it.\nIn this game, you are the missile, and you get to see the view of the world from the missile's IR seeker (heat imager).\nYou have to track down the enemy (currently a cube that can do turns), but you also have to avoid the distractions, flares. Flares are bright/hot material ejected by enemy planes to confuse missiles into homing in on the flare instead of the actual plane.\nYou'll need to avoid the flares. As to how, you can figure that out :)\n\nCheck out the settings before you begin to get a feel for the game!\n\nReminder: WASD to turn, Space to explode!\n\nP.S. The game is pretty hard, you should start off with IRCCM on and proxy fuse on auto targetting mode, then work your way into using different modes.")
}

function supportsES6() {
    try {
        // Arrow function
        eval("() => {}");

        // Let and Const
        eval("let x = 1; const y = 2;");

        // Class
        eval("class MyClass {}");

        // Template Literals
        eval("let str = `template literal`;");

        // Default Parameters
        eval("function func(x = 1) {}");

        return true;
    } catch (e) {
        return false;
    }
}

// Check javascript version
if (!supportsES6()) {
    alert("Your browser does not support ES6. This game and THREE.js requires ES6. Please update your browser.");
    document.getElementById('jsCompat').innerText = "ES6 Unsupported";
    document.getElementById('jsCompat').style.color = 'red';
} else {
    document.getElementById('jsCompat').innerText = "ES6 Supported";

}