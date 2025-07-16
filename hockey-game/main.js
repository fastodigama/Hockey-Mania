const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#aad7f9',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

let player, bot, puck;
let cursors;
let puckSpeed = 400;
let timerText, timeLeft = 60;
let matchEnded = false;

const game = new Phaser.Game(config);

function preload() {
  // Optionally preload sound assets or fonts here
}

function create() {
  // Rink visuals
  this.add.rectangle(400, 300, 800, 4, 0xffffff);
  this.add.circle(400, 300, 50, 0xffffff, 0.2);
  this.add.rectangle(400, 580, 120, 40, 0xeeeeee, 0.3);
  this.add.rectangle(400, 20, 120, 40, 0xeeeeee, 0.3);

  for (let i = 0; i < 800; i += 40) {
    this.add.rectangle(i, 0, 20, 10, 0xffffff);
    this.add.rectangle(i, 600, 20, 10, 0xffffff);
  }
  for (let i = 0; i < 600; i += 40) {
    this.add.rectangle(0, i, 10, 20, 0xffffff);
    this.add.rectangle(800, i, 10, 20, 0xffffff);
  }

  // Player (Goalie)
  player = this.add.rectangle(400, 550, 70, 50, 0x228b22);
  this.physics.add.existing(player);
  player.body.setAllowGravity(false);
  player.body.setImmovable(false);
  player.body.setCollideWorldBounds(true);
  player.body.setBounce(1, 1);
  player.body.setDrag(1000, 1000);

  // Bot (Goalie)
  bot = this.add.rectangle(400, 50, 70, 50, 0x8b0000);
  this.physics.add.existing(bot);
  bot.body.setImmovable(true);
  bot.body.setCollideWorldBounds(true);

  // Puck
  puck = this.add.circle(400, 300, 15, 0x000000);
  this.physics.add.existing(puck);
  puck.body.setBounce(1, 1);
  puck.body.setCollideWorldBounds(true);
  puck.body.setVelocity(puckSpeed, puckSpeed);

  // Goals
  const topGoal = this.add.rectangle(400, 10, 200, 20, 0xffd700, 0.3);
  const bottomGoal = this.add.rectangle(400, 590, 200, 20, 0xffd700, 0.3);
  this.physics.add.existing(topGoal, true);
  this.physics.add.existing(bottomGoal, true);

  // Scoreboard
  this.playerScore = 0;
  this.botScore = 0;
  this.scoreText = this.add.text(290, 20, 'Player: 0  |  Bot: 0', {
    fontSize: '24px',
    fill: '#fff'
  });
  timerText = this.add.text(30, 20, 'Time: 60', {
    fontSize: '24px',
    fill: '#fff'
  });

  // Reset Button
  this.add.text(700, 20, 'Reset', {
    fontSize: '20px',
    backgroundColor: '#000',
    color: '#fff',
    padding: { x: 10, y: 5 }
  })
  .setInteractive()
  .on('pointerdown', () => {
    resetGame.call(this);
  });

  // Collisions
  this.physics.add.collider(bot, puck);
  this.physics.add.collider(player, puck, () => {
    const angle = Phaser.Math.Angle.Between(player.x, player.y, puck.x, puck.y);
    const speed = Math.max(puck.body.speed, puckSpeed * 0.8);
    this.physics.velocityFromRotation(angle, speed, puck.body.velocity);
  }, null, this);

  // Goal detection
  this.physics.add.overlap(puck, topGoal, () => {
    if (matchEnded) return;
    this.playerScore++;
    puckSpeed += 10;
    this.scoreText.setText(`Player: ${this.playerScore}  |  Bot: ${this.botScore}`);
    goalCelebrate.call(this);
    resetPuck.call(this);
  });

  this.physics.add.overlap(puck, bottomGoal, () => {
    if (matchEnded) return;
    this.botScore++;
    puckSpeed += 10;
    this.scoreText.setText(`Player: ${this.playerScore}  |  Bot: ${this.botScore}`);
    goalCelebrate.call(this);
    resetPuck.call(this);
  });

  // Input
  cursors = this.input.keyboard.createCursorKeys();

  // Match timer
  this.time.addEvent({
    delay: 1000,
    loop: true,
    callback: () => {
      if (matchEnded) return;
      if (timeLeft > 0) {
        timeLeft--;
        timerText.setText(`Time: ${timeLeft}`);
      } else {
        endMatch.call(this);
      }
    }
  });
}

function update() {
  if (matchEnded) return;

  player.body.setVelocity(0);
  const speed = 150;

  if (cursors.left.isDown) player.body.setVelocityX(-speed);
  else if (cursors.right.isDown) player.body.setVelocityX(speed);

  if (cursors.up.isDown) player.body.setVelocityY(-speed);
  else if (cursors.down.isDown) player.body.setVelocityY(speed);

  // Bot AI with puck prediction
  if (puck.y < 300) {
    const prediction = puck.x + puck.body.velocity.x * 0.1;
    if (prediction < bot.x - 5) bot.body.setVelocityX(-100);
    else if (prediction > bot.x + 5) bot.body.setVelocityX(100);
    else bot.body.setVelocityX(0);
  } else {
    bot.body.setVelocityX(0);
  }
}

function resetPuck() {
  puck.body.setVelocity(0);
  puck.setPosition(400, 300);

  this.time.delayedCall(1000, () => {
    const angle = Phaser.Math.Between(-45, 45);
    const direction = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
    this.physics.velocityFromRotation(angle, puckSpeed, puck.body.velocity);
    puck.body.velocity.y *= direction;
  });
}

function goalCelebrate() {
  this.cameras.main.shake(200, 0.005);
}

function endMatch() {
  matchEnded = true;

  puck.body.setVelocity(0);
  player.body.setVelocity(0);
  bot.body.setVelocity(0);

  let result;
  if (this.playerScore > this.botScore) result = '🏆 Player Wins!';
  else if (this.botScore > this.playerScore) result = '🤖 Bot Wins!';
  else result = '⚔️ It\'s a Draw!';

  this.add.text(250, 250, result, {
    fontSize: '32px',
    fill: '#ffd700',
    backgroundColor: '#000',
    padding: { x: 20, y: 10 }
  });
}

function resetGame() {
  this.playerScore = 0;
  this.botScore = 0;
  puckSpeed = 400;
  timeLeft = 60;
  matchEnded = false;

  this.scoreText.setText('Player: 0  |  Bot: 0');
  timerText.setText('Time: 60');
  resetPuck.call(this);
   location.reload();
}
