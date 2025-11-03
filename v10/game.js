// LOTUS DEFENSE v4.0 - Platanus Hack 25
// Tower Defense con Progresión, Perspectiva Isométrica y Sistema de Upgrades

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#1a237e',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: { preload, create, update }
};

// Variables globales mejoradas
let player, cursors, nectarFlowers, enemies, defenseLotuses, projectiles, flies;
let nectar = 150, health = 3, wave = 0, enemiesRemaining = 0, score = 0;
let nectarText, healthText, waveText, waveStatusText, scoreText;
let inWave = false, preparationTime = 15, waveTimer = null;
let selectedPlant = 'shooter', plantCards = [];
let keys = {}, particles, ripples = [], bubbles = [], waterPlants = [];
let powerUps = [], currentPowerUp = null, powerUpTime = 0;
let upgrades = { damage: 0, range: 0, speed: 0, nectar: 0 };
let upgradeUI = [];
let highScores = [];
let musicBeat = null, musicTempo = 350;
let dangerLevel = 0;
let towers = [], towerBabies = 5; // 5 torres con bebés

// Dimensiones del mundo
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;

// Lotos defensivos con durabilidad REDUCIDA (más difícil) + DESGASTE PASIVO
const LOTUS_TYPES = {
    shooter: { cost: 35, name: 'Disparador', desc: 'Dispara', color: 0xff6b9d, emoji: '🌸', damage: 20, fireRate: 900, range: 200, durability: 8, maxDurability: 8, passiveDecay: 0.5 },
    explosive: { cost: 60, name: 'Explosivo', desc: 'Explota', color: 0xff5722, emoji: '💥', damage: 50, radius: 100, durability: 1, maxDurability: 1, passiveDecay: 0 },
    healer: { cost: 45, name: 'Sanador', desc: 'Cura', color: 0x4caf50, emoji: '💚', healAmount: 1, cooldown: 5000, durability: 5, maxDurability: 5, passiveDecay: 0.3 },
    freeze: { cost: 55, name: 'Hielo', desc: 'Congela', color: 0x00bcd4, emoji: '❄️', duration: 2500, range: 150, durability: 6, maxDurability: 6, passiveDecay: 0.4 },
    wall: { cost: 25, name: 'Muro', desc: 'Bloquea', color: 0x8d6e63, emoji: '🛡️', health: 80, durability: 999, maxDurability: 80, blocksEnemies: true, passiveDecay: 2 },
    generator: { cost: 100, name: 'Generador', desc: 'Genera 🍯', color: 0xffd54f, emoji: '⚡', production: 8, interval: 3000, lifetime: 30000, durability: 999, maxDurability: 999, passiveDecay: 0 },
    electric: { cost: 80, name: 'Eléctrico', desc: 'Electriza', color: 0xffeb3b, emoji: '⚡', damage: 12, range: 170, chainCount: 3, durability: 10, maxDurability: 10, passiveDecay: 0.6 }
};

// Enemigos mejorados
const ENEMY_TYPES = {
    basic: { health: 40, speed: 80, color: 0xef5350, size: 0.75, points: 15, power: 'none' },
    fast: { health: 25, speed: 140, color: 0xffa726, size: 0.55, points: 20, power: 'none' },
    tank: { health: 110, speed: 50, color: 0x7e57c2, size: 1.15, points: 35, power: 'none' },
    exploder: { health: 30, speed: 85, color: 0xff5722, size: 0.8, points: 25, power: 'explode' },
    fire: { health: 50, speed: 70, color: 0xff6f00, size: 0.85, points: 28, power: 'fire' },
    shooter: { health: 55, speed: 65, color: 0x5c6bc0, size: 0.9, points: 30, power: 'shoot' },
    boss: { health: 300, speed: 60, color: 0xf44336, size: 1.5, points: 150, power: 'all' }
};

// Power-ups disponibles
const POWER_UP_TYPES = {
    damage: { emoji: '💪', name: 'Daño x2', duration: 15000, color: 0xff5722 },
    speed: { emoji: '⚡', name: 'Velocidad x1.5', duration: 12000, color: 0xffeb3b },
    shield: { emoji: '🛡️', name: 'Escudo', duration: 20000, color: 0x00bcd4 },
    multishot: { emoji: '🎯', name: 'Triple Disparo', duration: 10000, color: 0xe91e63 }
};

const game = new Phaser.Game(config);

function preload() {
    generateTextures(this);
}

function create() {
    // Mundo más grande
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    
    createIsometricBackground(this);
    
    nectarFlowers = this.physics.add.group();
    enemies = this.physics.add.group();
    defenseLotuses = this.physics.add.group();
    projectiles = this.physics.add.group();
    flies = this.physics.add.group();
    particles = this.add.group();
    powerUps = this.physics.add.group();
    
    // Crear 5 torres con bebés
    createTowers(this);
    
    player = this.physics.add.sprite(WORLD_WIDTH/2, WORLD_HEIGHT/2, 'player');
    player.setScale(0.95).setDepth(100).setCollideWorldBounds(true);
    player.speedBoostTime = 0;
    player.isShielded = false;
    
    // Cámara sigue al jugador
    this.cameras.main.startFollow(player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setZoom(1);
    
    cursors = this.input.keyboard.createCursorKeys();
    keys.W = this.input.keyboard.addKey('W');
    keys.A = this.input.keyboard.addKey('A');
    keys.S = this.input.keyboard.addKey('S');
    keys.D = this.input.keyboard.addKey('D');
    keys.SPACE = this.input.keyboard.addKey('SPACE');
    keys.TAB = this.input.keyboard.addKey('TAB');
    keys.Q = this.input.keyboard.addKey('Q');
    
    // NUEVO: Click en cualquier lado cambia la carta seleccionada
    this.input.on('pointerdown', () => {
        rotatePlant.call(this);
    });
    
    createUI(this);
    
    this.physics.add.overlap(player, nectarFlowers, collectNectar, null, this);
    this.physics.add.overlap(player, enemies, hitPlayer, null, this);
    this.physics.add.overlap(player, flies, collectFly, null, this);
    this.physics.add.overlap(player, powerUps, collectPowerUp, null, this);
    this.physics.add.overlap(projectiles, enemies, hitEnemy, null, this);
    
    // Colisiones de proyectiles enemigos con muros
    this.physics.add.overlap(projectiles, defenseLotuses, (proj, lotus) => {
        if (proj.fromEnemy && lotus.lotusType === 'wall') {
            lotus.health -= 20;
            if (lotus.health <= 0) {
                if (lotus.emoji) lotus.emoji.destroy();
                lotus.destroy();
            }
            proj.destroy();
        }
    });
    
    // NUEVO: Colisión física de enemigos con muros
    this.physics.add.collider(enemies, defenseLotuses, null, (enemy, lotus) => {
        return lotus.lotusType === 'wall'; // Solo muros bloquean físicamente
    }, this);
    
    startMusic(this);
    showTutorial(this);
}

function createTowers(scene) {
    // Posiciones estratégicas en el mapa
    const positions = [
        { x: 400, y: 300 },      // Centro
        { x: 300, y: 200 },      // Arriba izquierda
        { x: 1300, y: 300 },     // Derecha
        { x: 500, y: 900 },      // Abajo izquierda
        { x: 1100, y: 800 }      // Abajo derecha
    ];
    
    positions.forEach((pos, i) => {
        const towerSprite = scene.add.sprite(pos.x, pos.y, 'tower');
        towerSprite.setScale(1.5).setDepth(55);
        
        const baby = scene.add.sprite(pos.x, pos.y - 40, 'baby');
        baby.setScale(1).setDepth(56);
        
        // Barra de vida de la torre
        const healthBar = scene.add.graphics().setDepth(57);
        
        const tower = {
            sprite: towerSprite,
            baby: baby,
            healthBar: healthBar,
            x: pos.x,
            y: pos.y,
            health: 200, // Reducido de 500 para mejor balance
            maxHealth: 200,
            babyAlive: true,
            babyHealth: 40,
            maxBabyHealth: 40
        };
        
        towers.push(tower);
        updateTowerHealthBar(tower);
    });
}

function updateTowerHealthBar(tower) {
    tower.healthBar.clear();
    
    if (tower.babyAlive) {
        // Barra de la torre (verde/amarillo/rojo)
        const healthPercent = tower.health / tower.maxHealth;
        tower.healthBar.fillStyle(0x000000, 0.6);
        tower.healthBar.fillRect(tower.x - 40, tower.y - 60, 80, 8);
        
        let color = 0x4caf50;
        if (healthPercent < 0.5) color = 0xff9800;
        if (healthPercent < 0.25) color = 0xf44336;
        
        tower.healthBar.fillStyle(color, 1);
        tower.healthBar.fillRect(tower.x - 40, tower.y - 60, 80 * healthPercent, 8);
    } else {
        // Barra del bebé (muy pequeña, roja)
        const babyPercent = tower.babyHealth / tower.maxBabyHealth;
        tower.healthBar.fillStyle(0x000000, 0.6);
        tower.healthBar.fillRect(tower.x - 30, tower.y - 70, 60, 6);
        tower.healthBar.fillStyle(0xff1744, 1);
        tower.healthBar.fillRect(tower.x - 30, tower.y - 70, 60 * babyPercent, 6);
    }
}

function update(time, delta) {
    if (!player.active) return;
    
    // Actualizar power-up
    if (currentPowerUp) {
        powerUpTime -= delta;
        if (powerUpTime <= 0) {
            currentPowerUp = null;
            powerUpTime = 0;
            updatePowerUpDisplay.call(this);
        } else {
            updatePowerUpDisplay.call(this);
        }
    }
    
    // Calcular nivel de peligro para música dinámica
    let closeEnemies = 0;
    enemies.children.entries.forEach(enemy => {
        const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
        if (dist < 200) closeEnemies++;
    });
    dangerLevel = Math.min(closeEnemies / 3, 1);
    
    // Animación de bebés con movimiento de cola
    towers.forEach((tower, i) => {
        if (tower.babyAlive) {
            // Movimiento flotante
            tower.baby.y = tower.y - 40 + Math.sin(time * 0.003 + i * 0.5) * 4;
            // Rotación suave de la cola
            tower.baby.rotation = Math.sin(time * 0.004 + i * 0.3) * 0.15;
            tower.baby.setVisible(true);
        } else {
            tower.baby.setVisible(false);
        }
    });
    
    const baseSpeed = 240 + (upgrades.speed * 30);
    const boost = player.speedBoostTime > time ? 100 : 0;
    const powerBoost = currentPowerUp === 'speed' ? 80 : 0;
    const speed = baseSpeed + boost + powerBoost;
    player.setVelocity(0);
    
    if (cursors.left.isDown || keys.A.isDown) {
        player.setVelocityX(-speed);
        player.flipX = true;
    } else if (cursors.right.isDown || keys.D.isDown) {
        player.setVelocityX(speed);
        player.flipX = false;
    }
    if (cursors.up.isDown || keys.W.isDown) player.setVelocityY(-speed);
    else if (cursors.down.isDown || keys.S.isDown) player.setVelocityY(speed);
    
    if (Phaser.Input.Keyboard.JustDown(keys.TAB) || Phaser.Input.Keyboard.JustDown(keys.Q)) rotatePlant.call(this);
    if (Phaser.Input.Keyboard.JustDown(keys.SPACE)) plantLotus(this, player.x, player.y);
    
    enemies.children.entries.forEach(enemy => {
        if (!enemy.frozen) {
            // Enemigos eligen objetivo: torre o jugador
            if (enemy.targetType === 'tower') {
                let nearestTower = null;
                let minDist = 99999;
                
                towers.forEach(tower => {
                    if (tower.babyAlive || tower.health > 0) {
                        const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, tower.x, tower.y);
                        if (dist < minDist) {
                            minDist = dist;
                            nearestTower = tower;
                        }
                    }
                });
                
                if (nearestTower) {
                    this.physics.moveToObject(enemy, nearestTower.sprite, enemy.speed);
                    
                    // Atacar torre al contacto - ARREGLO DEL BUG
                    if (minDist < 60) {
                        if (!enemy.lastTowerAttack) enemy.lastTowerAttack = 0;
                        if (time - enemy.lastTowerAttack > 800) {
                            enemy.lastTowerAttack = time;
                            damageTower(this, nearestTower, 8 + Math.floor(wave * 0.5));
                            
                            // Efecto visual de ataque
                            createParticles(this, nearestTower.x, nearestTower.y, 0xff5722, 8);
                            playSound(this, 200, 0.08);
                        }
                    }
                } else {
                    // Si no hay torres, atacar al jugador
                    this.physics.moveToObject(enemy, player, enemy.speed);
                }
            } else if (enemy.attacksLotuses && Math.random() < 0.02) {
                // Atacar lotos
                let nearestLotus = null;
                let minDist = 300;
                defenseLotuses.children.entries.forEach(lotus => {
                    const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, lotus.x, lotus.y);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestLotus = lotus;
                    }
                });
                if (nearestLotus) {
                    this.physics.moveToObject(enemy, nearestLotus, enemy.speed);
                } else {
                    this.physics.moveToObject(enemy, player, enemy.speed);
                }
            } else {
                // Atacar jugador
                this.physics.moveToObject(enemy, player, enemy.speed);
            }
            
            enemy.flipX = enemy.body.velocity.x < 0;
            
            if ((enemy.power === 'fire' || enemy.power === 'shoot' || enemy.power === 'all') && time - enemy.lastPower > 2500) {
                enemy.lastPower = time;
                fireEnemyProjectile(this, enemy);
            }
            
            // Enemigos atacan lotos al contacto
            defenseLotuses.children.entries.forEach(lotus => {
                if (Phaser.Math.Distance.Between(enemy.x, enemy.y, lotus.x, lotus.y) < 45) {
                    if (!enemy.lastLotusAttack) enemy.lastLotusAttack = 0;
                    if (time - enemy.lastLotusAttack > 1000) {
                        enemy.lastLotusAttack = time;
                        damageLotus(this, lotus, 1);
                    }
                }
            });
        }
    });
    
    defenseLotuses.children.entries.forEach(lotus => {
        if (!lotus.active) return;
        
        // Desgaste pasivo cada segundo
        if (!lotus.lastPassiveDecay) lotus.lastPassiveDecay = 0;
        if (time - lotus.lastPassiveDecay > 1000) {
            lotus.lastPassiveDecay = time;
            const lotusType = LOTUS_TYPES[lotus.lotusType];
            
            if (lotusType.passiveDecay > 0) {
                if (lotus.lotusType === 'wall') {
                    lotus.health -= lotusType.passiveDecay;
                    updateLotusDurabilityBar(lotus);
                    if (lotus.health <= 0) {
                        if (lotus.emoji) lotus.emoji.destroy();
                        if (lotus.durabilityBar) lotus.durabilityBar.destroy();
                        createParticles(this, lotus.x, lotus.y, 0x8d6e63, 12);
                        lotus.destroy();
                        return;
                    }
                } else if (lotus.durability !== 999) {
                    lotus.durability -= lotusType.passiveDecay;
                    updateLotusDurabilityBar(lotus);
                    if (lotus.durability <= 0) {
                        if (lotus.emoji) lotus.emoji.destroy();
                        if (lotus.durabilityBar) lotus.durabilityBar.destroy();
                        createParticles(this, lotus.x, lotus.y, 0x8d6e63, 12);
                        lotus.destroy();
                        return;
                    }
                }
            }
        }
        
        if (lotus.lotusType === 'shooter') updateShooterLotus(this, lotus, time);
        else if (lotus.lotusType === 'explosive') updateExplosiveLotus(this, lotus);
        else if (lotus.lotusType === 'healer') updateHealerLotus(this, lotus, time);
        else if (lotus.lotusType === 'freeze') updateFreezeLotus(this, lotus, time);
        else if (lotus.lotusType === 'generator') updateGeneratorLotus(this, lotus, time);
        else if (lotus.lotusType === 'electric') updateElectricLotus(this, lotus, time);
        
        if (lotus.lotusType !== 'wall' && lotus.emoji) {
            lotus.emoji.x = lotus.x;
            lotus.emoji.y = lotus.y - 5 - Math.sin(time * 0.003) * 3;
            lotus.setScale(0.9 + Math.sin(time * 0.003) * 0.05);
        }
        
        // Actualizar posición de barra de durabilidad
        if (lotus.durabilityBar && lotus.active) {
            updateLotusDurabilityBar(lotus);
        }
    });
    
    projectiles.children.entries.forEach(p => {
        if (p.x < -50 || p.x > WORLD_WIDTH + 50 || p.y < -50 || p.y > WORLD_HEIGHT + 50) p.destroy();
    });
    
    nectarFlowers.children.entries.forEach((f, i) => {
        f.y += Math.sin(time * 0.001 + i) * 0.3;
        f.rotation += 0.002;
    });
    
    flies.children.entries.forEach((f, i) => {
        f.y += Math.sin(time * 0.004 + i) * 2;
        f.x += Math.cos(time * 0.003 + i) * 1.5;
    });
    
    powerUps.children.entries.forEach(p => {
        p.y += Math.sin(time * 0.002 + p.x * 0.01) * 0.5;
        p.setScale(1 + Math.sin(time * 0.005) * 0.1);
    });
    
    particles.children.entries.forEach(p => {
        p.alpha -= 0.015;
        p.y -= p.vy || 1;
        p.x += p.vx || 0;
        if (p.alpha <= 0) p.destroy();
    });
    
    bubbles.forEach((b, i) => {
        b.y -= 0.8;
        b.alpha -= 0.005;
        b.scaleX += 0.002;
        b.scaleY += 0.002;
        if (b.alpha <= 0 || b.y < 0) {
            b.destroy();
            bubbles.splice(i, 1);
        }
    });
    
    ripples.forEach((r, i) => {
        r.alpha -= 0.02;
        r.scaleX += 0.04;
        r.scaleY += 0.04;
        if (r.alpha <= 0) {
            r.destroy();
            ripples.splice(i, 1);
        }
    });
    
    waterPlants.forEach(wp => {
        wp.y += Math.sin(time * 0.002 + wp.initialY * 0.01) * 0.3;
    });
    
    // Verificar game over por torres
    let allTowersDead = towers.every(t => !t.babyAlive && t.health <= 0);
    if (allTowersDead && towerBabies === 0) {
        gameOver(this, 'towers');
        return;
    }
    
    // ARREGLO DEL BUG: Verificar correctamente el fin de oleada
    if (inWave && enemiesRemaining <= 0 && enemies.children.size === 0) {
        endWave(this);
    }
}

function damageTower(scene, tower, damage) {
    if (tower.babyAlive) {
        tower.health -= damage;
        updateTowerHealthBar(tower);
        
        if (tower.health <= 0) {
            // Torre destruida, ahora el bebé es vulnerable
            tower.health = 0;
            tower.sprite.setTint(0x555555); // Tronco gris
            createParticles(scene, tower.x, tower.y, 0x8d6e63, 20);
            playSound(scene, 150, 0.2);
        }
    } else {
        // Atacar al bebé directamente
        tower.babyHealth -= damage * 2; // Los bebés mueren más rápido
        updateTowerHealthBar(tower);
        
        if (tower.babyHealth <= 0) {
            tower.babyHealth = 0;
            tower.babyAlive = false;
            towerBabies--;
            tower.healthBar.destroy();
            createParticles(scene, tower.x, tower.y - 50, 0x66bb6a, 30);
            playSound(scene, 100, 0.3);
            
            // Texto de alerta
            const alertText = scene.add.text(tower.x, tower.y - 80, '💀 BEBÉ MUERTO', {
                fontSize: '24px',
                fill: '#ff1744',
                fontFamily: 'Arial',
                stroke: '#000',
                strokeThickness: 5
            }).setOrigin(0.5).setDepth(200);
            
            scene.tweens.add({
                targets: alertText,
                y: tower.y - 120,
                alpha: 0,
                duration: 2000,
                onComplete: () => alertText.destroy()
            });
        }
    }
}

function generateTextures(scene) {
    let g = scene.add.graphics();
    
    // Player mejorado con perspectiva
    g.fillStyle(0x66bb6a, 1);
    g.fillEllipse(32, 40, 32, 28);
    g.fillStyle(0x4caf50, 1);
    g.fillEllipse(32, 38, 28, 24);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(24, 32, 9);
    g.fillCircle(40, 32, 9);
    g.fillStyle(0x000000, 1);
    g.fillCircle(24, 32, 5);
    g.fillCircle(40, 32, 5);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(25, 31, 2);
    g.fillCircle(41, 31, 2);
    g.lineStyle(3, 0x2e7d32, 1);
    g.beginPath();
    g.arc(32, 38, 10, 0.3, Math.PI - 0.3);
    g.strokePath();
    g.generateTexture('player', 64, 64);
    g.destroy();
    
    // Néctar con brillo
    g = scene.add.graphics();
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = 24 + Math.cos(angle) * 14;
        const y = 24 + Math.sin(angle) * 14;
        g.fillStyle(0xffd54f, 1);
        g.fillEllipse(x, y, 12, 16);
    }
    g.fillStyle(0xffeb3b, 1);
    g.fillCircle(24, 24, 10);
    g.fillStyle(0xffa000, 1);
    g.fillCircle(24, 24, 6);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(20, 20, 3);
    g.generateTexture('nectar', 48, 48);
    g.destroy();
    
    // Enemigo mejorado
    g = scene.add.graphics();
    g.fillStyle(0xff6b6b, 1);
    g.fillEllipse(32, 38, 30, 26);
    g.fillStyle(0xff4444, 1);
    g.fillEllipse(32, 36, 26, 22);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(24, 30, 8);
    g.fillCircle(40, 30, 8);
    g.fillStyle(0xff0000, 1);
    g.fillCircle(24, 30, 4);
    g.fillCircle(40, 30, 4);
    g.lineStyle(2, 0xd32f2f, 1);
    g.beginPath();
    g.arc(32, 38, 8, 0.2, Math.PI - 0.2);
    g.strokePath();
    g.generateTexture('enemy', 64, 64);
    g.destroy();
    
    // Loto con perspectiva
    g = scene.add.graphics();
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = 32 + Math.cos(angle) * 20;
        const y = 32 + Math.sin(angle) * 16;
        g.fillStyle(0xff6b9d, 1);
        g.fillEllipse(x, y, 16, 24);
    }
    g.fillStyle(0xfeca57, 1);
    g.fillCircle(32, 32, 14);
    g.fillStyle(0xffa000, 0.4);
    g.fillCircle(32, 32, 8);
    g.generateTexture('lotus', 64, 64);
    g.destroy();
    
    // Proyectil mejorado
    g = scene.add.graphics();
    g.fillStyle(0xffeb3b, 1);
    g.fillCircle(8, 8, 7);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(8, 8, 4);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(6, 6, 2);
    g.generateTexture('projectile', 16, 16);
    g.destroy();
    
    // Mosca
    g = scene.add.graphics();
    g.fillStyle(0x424242, 1);
    g.fillEllipse(8, 8, 7, 11);
    g.fillStyle(0x757575, 0.5);
    g.fillEllipse(5, 6, 9, 5);
    g.fillEllipse(11, 6, 9, 5);
    g.generateTexture('fly', 16, 16);
    g.destroy();
    
    // Partícula
    g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
    
    // Burbuja
    g = scene.add.graphics();
    g.lineStyle(2, 0xffffff, 0.6);
    g.strokeCircle(16, 16, 14);
    g.fillStyle(0xffffff, 0.2);
    g.fillCircle(16, 16, 14);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(12, 12, 4);
    g.generateTexture('bubble', 32, 32);
    g.destroy();
    
    // Ripple
    g = scene.add.graphics();
    g.lineStyle(3, 0x81d4fa, 0.6);
    g.strokeCircle(32, 32, 28);
    g.generateTexture('ripple', 64, 64);
    g.destroy();
    
    // Torre (tronco de madera)
    g = scene.add.graphics();
    g.fillStyle(0x8d6e63, 1);
    g.fillRect(20, 10, 24, 44);
    g.fillStyle(0x6d4c41, 1);
    g.fillRect(22, 12, 20, 40);
    g.fillStyle(0x5d4037, 0.8);
    for (let i = 0; i < 5; i++) {
        g.fillCircle(26 + Math.random() * 12, 15 + i * 8, 2);
    }
    g.lineStyle(2, 0x4e342e, 0.6);
    for (let i = 0; i < 4; i++) {
        g.lineBetween(22, 20 + i * 10, 42, 20 + i * 10);
    }
    g.generateTexture('tower', 64, 64);
    g.destroy();
    
    // Bebé renacuajo HORIZONTAL (espermatozoide style)
    g = scene.add.graphics();
    // Cabeza
    g.fillStyle(0x66bb6a, 1);
    g.fillCircle(12, 16, 9);
    g.fillStyle(0x4caf50, 1);
    g.fillCircle(12, 16, 6);
    // Ojos
    g.fillStyle(0xffffff, 1);
    g.fillCircle(10, 14, 2.5);
    g.fillCircle(14, 14, 2.5);
    g.fillStyle(0x000000, 1);
    g.fillCircle(10, 14, 1);
    g.fillCircle(14, 14, 1);
    // Cola ondulada hacia la derecha
    g.fillStyle(0x66bb6a, 1);
    g.beginPath();
    g.moveTo(20, 16);
    const tailSegments = [
        {x: 26, y: 16}, {x: 30, y: 18}, {x: 34, y: 16},
        {x: 38, y: 14}, {x: 42, y: 16}, {x: 46, y: 18}
    ];
    for (let p of tailSegments) {
        g.lineTo(p.x, p.y);
    }
    g.lineStyle(5, 0x66bb6a, 1);
    g.strokePath();
    g.generateTexture('baby', 50, 32);
    g.destroy();
    
    // Power-up genérico
    g = scene.add.graphics();
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(16, 16, 12);
    g.fillStyle(0xffeb3b, 0.6);
    g.fillCircle(16, 16, 8);
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeCircle(16, 16, 14);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(12, 12, 3);
    g.generateTexture('powerup', 32, 32);
    g.destroy();
}

function createIsometricBackground(scene) {
    const g = scene.add.graphics();
    
    // Gradiente de profundidad (más oscuro arriba, más claro abajo)
    for (let y = 0; y < WORLD_HEIGHT; y += 3) {
        const t = y / WORLD_HEIGHT;
        const r = Math.floor(40 + t * 100);
        const gr = Math.floor(150 + t * 80);
        const b = Math.floor(190 + t * 60);
        g.fillStyle(Phaser.Display.Color.GetColor(r, gr, b), 1);
        g.fillRect(0, y, WORLD_WIDTH, 3);
    }
    
    // Ondas animadas en capas
    const waves = scene.add.graphics().setDepth(1);
    scene.time.addEvent({
        delay: 40,
        callback: () => {
            waves.clear();
            const time = scene.time.now * 0.0005;
            for (let layer = 0; layer < 15; layer++) {
                const alpha = 0.12 + (layer % 3) * 0.08;
                const baseY = 100 + layer * 80;
                waves.lineStyle(2, 0x81d4fa, alpha);
                waves.beginPath();
                for (let x = 0; x < WORLD_WIDTH; x += 5) {
                    const wave1 = Math.sin(x * 0.008 + time + layer * 0.3) * 20;
                    const wave2 = Math.sin(x * 0.015 + time * 1.3 + layer * 0.5) * 10;
                    const y = baseY + wave1 + wave2;
                    if (x === 0) waves.moveTo(x, y);
                    else waves.lineTo(x, y);
                }
                waves.strokePath();
            }
        },
        loop: true
    });
    
    // Plantas acuáticas decorativas
    for (let i = 0; i < 40; i++) {
        const x = Phaser.Math.Between(0, WORLD_WIDTH);
        const y = Phaser.Math.Between(0, WORLD_HEIGHT);
        const plant = scene.add.graphics().setDepth(0.5);
        const hue = Phaser.Math.Between(0, 60);
        plant.fillStyle(Phaser.Display.Color.GetColor(50 + hue, 150 + hue, 100 + hue), 0.3);
        for (let j = 0; j < 3; j++) {
            plant.fillEllipse(x + j * 8, y, 6, 30);
        }
        plant.initialY = y;
        plant.x = x;
        plant.y = y;
        waterPlants.push(plant);
    }
    
    // Burbujas constantes
    scene.time.addEvent({
        delay: 600,
        callback: () => {
            const b = scene.add.sprite(
                Phaser.Math.Between(0, WORLD_WIDTH),
                WORLD_HEIGHT + 20,
                'bubble'
            );
            b.setScale(0.4 + Math.random() * 0.6).setAlpha(0.5).setDepth(2);
            bubbles.push(b);
        },
        loop: true
    });
    
    // Partículas flotantes ambientales
    scene.time.addEvent({
        delay: 1200,
        callback: () => {
            const p = scene.add.sprite(
                Phaser.Math.Between(0, WORLD_WIDTH),
                Phaser.Math.Between(0, WORLD_HEIGHT),
                'particle'
            );
            p.setTint(0xffffff).setAlpha(0.3).setScale(0.6).setDepth(1.5);
            scene.tweens.add({
                targets: p,
                y: p.y - 150,
                alpha: 0,
                duration: 6000,
                onComplete: () => p.destroy()
            });
        },
        loop: true
    });
}

function createUI(scene) {
    // UI fija en cámara
    const cam = scene.cameras.main;
    
    scene.add.rectangle(400, 30, 800, 60, 0x000000, 0.8).setDepth(200).setScrollFactor(0);
    
    nectarText = scene.add.text(20, 12, '🍯 ' + nectar, {
        fontSize: '24px',
        fill: '#ffd54f',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 4
    }).setDepth(201).setScrollFactor(0);
    
    healthText = scene.add.text(180, 12, '', { fontSize: '24px' }).setDepth(201).setScrollFactor(0);
    updateHealthDisplay();
    
    // Indicador de bebés vivos
    const babyIndicator = scene.add.text(330, 12, '👶x5', {
        fontSize: '22px',
        fill: '#66bb6a',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 3
    }).setDepth(201).setScrollFactor(0);
    
    scene.babyIndicator = babyIndicator; // Guardar referencia
    
    waveText = scene.add.text(680, 12, 'Oleada: 0', {
        fontSize: '20px',
        fill: '#4dd0e1',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 3
    }).setDepth(201).setScrollFactor(0).setOrigin(1, 0);
    
    scoreText = scene.add.text(490, 12, 'Score: 0', {
        fontSize: '18px',
        fill: '#ffd54f',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 3
    }).setDepth(201).setScrollFactor(0).setOrigin(0.5, 0);
    
    waveStatusText = scene.add.text(400, 70, '', {
        fontSize: '24px',
        fill: '#fff',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 5,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: { x: 20, y: 10 }
    }).setDepth(201).setScrollFactor(0).setOrigin(0.5, 0);
    
    createPlantCards(scene);
    createUpgradeUI(scene);
}

function updateBabyIndicator(scene) {
    if (scene.babyIndicator) {
        scene.babyIndicator.setText('👶x' + towerBabies);
        if (towerBabies <= 2) {
            scene.babyIndicator.setFill('#ff1744'); // Rojo si quedan pocos
        } else if (towerBabies <= 3) {
            scene.babyIndicator.setFill('#ff9800'); // Naranja
        }
    }
}

function createPlantCards(scene) {
    const cardX = 50;
    let cardY = 100;
    plantCards = [];
    
    Object.keys(LOTUS_TYPES).forEach(type => {
        const lotus = LOTUS_TYPES[type];
        
        const card = scene.add.rectangle(cardX, cardY, 70, 70, 0x000000, 0.85);
        card.setStrokeStyle(3, 0x4dd0e1).setDepth(200).setScrollFactor(0);
        
        const emoji = scene.add.text(cardX, cardY - 12, lotus.emoji, {
            fontSize: '28px'
        }).setOrigin(0.5).setDepth(201).setScrollFactor(0);
        
        const cost = scene.add.text(cardX, cardY + 15, lotus.cost, {
            fontSize: '14px',
            fill: '#ffd54f',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(201).setScrollFactor(0);
        
        // Descripción pequeña
        const desc = scene.add.text(cardX, cardY + 28, lotus.desc, {
            fontSize: '10px',
            fill: '#fff',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(201).setScrollFactor(0);
        
        plantCards.push({ card, emoji, cost, desc, type });
        cardY += 75;
    });
    
    scene.add.text(cardX, 580, 'Click/TAB', {
        fontSize: '11px',
        fill: '#fff',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 2
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0);
    
    updateCardSelection(scene);
}

function createUpgradeUI(scene) {
    const startX = 745;
    const startY = 100;
    
    const title = scene.add.text(startX, 75, 'Mejoras', {
        fontSize: '13px',
        fill: '#4dd0e1',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 2
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0);
    
    const upgradeTypes = [
        { key: 'damage', emoji: '💪', color: 0xff5722, name: 'Daño' },
        { key: 'range', emoji: '🎯', color: 0x4caf50, name: 'Alcance' },
        { key: 'speed', emoji: '⚡', color: 0xffeb3b, name: 'Velocidad' },
        { key: 'nectar', emoji: '🍯', color: 0xffd54f, name: 'Néctar' }
    ];
    
    upgradeTypes.forEach((upgrade, i) => {
        const y = startY + i * 65;
        
        const bg = scene.add.rectangle(startX, y, 55, 55, 0x000000, 0.8)
            .setDepth(200).setScrollFactor(0);
        
        const emoji = scene.add.text(startX, y - 6, upgrade.emoji, {
            fontSize: '24px'
        }).setOrigin(0.5).setDepth(201).setScrollFactor(0);
        
        const level = scene.add.text(startX, y + 14, '0', {
            fontSize: '13px',
            fill: '#fff',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(201).setScrollFactor(0);
        
        const name = scene.add.text(startX, y + 28, upgrade.name, {
            fontSize: '9px',
            fill: '#aaa',
            fontFamily: 'Arial'
        }).setOrigin(0.5).setDepth(201).setScrollFactor(0);
        
        upgradeUI.push({ bg, emoji, level, name, key: upgrade.key });
    });
}

function updateUpgradeUI() {
    upgradeUI.forEach(ui => {
        ui.level.setText(upgrades[ui.key].toString());
    });
}

function updateCardSelection(scene) {
    plantCards.forEach(({ card, type }) => {
        if (type === selectedPlant) {
            card.setStrokeStyle(4, 0x4caf50);
            card.setScale(1.15);
        } else {
            card.setStrokeStyle(3, 0x4dd0e1);
            card.setScale(1);
        }
    });
}

function damageTower(scene, tower, damage) {
    if (!tower.babyAlive && tower.health <= 0) return; // Ya está todo muerto
    
    if (tower.babyAlive && tower.health > 0) {
        // Atacar torre primero
        tower.health -= damage;
        updateTowerHealthBar(tower);
        
        if (tower.health <= 0) {
            // Torre destruida, ahora el bebé es vulnerable
            tower.health = 0;
            tower.sprite.setTint(0x555555); // Tronco gris
            createParticles(scene, tower.x, tower.y, 0x8d6e63, 25);
            playSound(scene, 150, 0.25);
            
            // Alerta visual
            const alertText = scene.add.text(tower.x, tower.y - 80, '⚠️ TORRE ROTA', {
                fontSize: '20px',
                fill: '#ff9800',
                fontFamily: 'Arial',
                stroke: '#000',
                strokeThickness: 4
            }).setOrigin(0.5).setDepth(200);
            
            scene.tweens.add({
                targets: alertText,
                y: tower.y - 110,
                alpha: 0,
                duration: 1500,
                onComplete: () => alertText.destroy()
            });
        }
    } else if (!tower.babyAlive) {
        // Solo atacar al bebé si la torre ya está rota
        return;
    } else {
        // Torre rota, atacar al bebé directamente
        tower.babyHealth -= damage * 3; // Los bebés mueren MÁS rápido
        updateTowerHealthBar(tower);
        
        if (tower.babyHealth <= 0) {
            tower.babyHealth = 0;
            tower.babyAlive = false;
            towerBabies--;
            tower.healthBar.destroy();
            createParticles(scene, tower.x, tower.y - 40, 0x66bb6a, 35);
            playSound(scene, 100, 0.35);
            
            // Actualizar indicador
            updateBabyIndicator(scene);
            
            // Texto de alerta
            const alertText = scene.add.text(tower.x, tower.y - 80, '💀 BEBÉ MUERTO', {
                fontSize: '26px',
                fill: '#ff1744',
                fontFamily: 'Arial',
                stroke: '#000',
                strokeThickness: 6
            }).setOrigin(0.5).setDepth(200);
            
            scene.tweens.add({
                targets: alertText,
                y: tower.y - 130,
                alpha: 0,
                duration: 2500,
                onComplete: () => alertText.destroy()
            });
        }
    }
}

function rotatePlant() {
    const types = Object.keys(LOTUS_TYPES);
    const current = types.indexOf(selectedPlant);
    selectedPlant = types[(current + 1) % types.length];
    updateCardSelection(this);
    playSound(this, 400, 0.05);
}

function showTutorial(scene) {
    const overlay = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.92).setDepth(300).setScrollFactor(0);
    
    const title = scene.add.text(400, 60, '🪷 LOTUS DEFENSE 🪷', {
        fontSize: '44px',
        fill: '#4dd0e1',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 7
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    
    const instructions = scene.add.text(400, 220, 
        '🎯 Evita que te maten a ti o a tus 5 renacuajos\n\n' +
        '🌸 Planta lotos para defender, usando néctar\n' +
        '🍯 Obtén néctar que encuentres, o planta un loto generador ⚡\n' +
        '⭐ Come moscas para acelerarte, o power-ups (cada 3 oleadas)\n' +
        '🎮 WASD = Mover | SPACE = Plantar\n' +
        'CLICK/TAB = Cambiar planta\n\n' +
        'Presiona ESPACIO para comenzar', 
        {
            fontSize: '17px',
            fill: '#fff',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 3,
            align: 'center',
            lineSpacing: 6
        }
    ).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    
    // Highscores en home (top 7)
    if (highScores.length > 0) {
        const hsTitle = scene.add.text(400, 380, '🏆 TOP SCORES', {
            fontSize: '22px',
            fill: '#ffd54f',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
        
        let yPos = 415;
        highScores.slice(0, 7).forEach((entry, i) => {
            const medals = ['🥇', '🥈', '🥉', '4', '5', '6', '7'];
            const text = scene.add.text(400, yPos, 
                medals[i] + ' ' + entry.name + ' - Nv.' + entry.wave + ' - ' + entry.score + 'pts', {
                fontSize: '13px',
                fill: '#fff',
                fontFamily: 'Arial',
                stroke: '#000',
                strokeThickness: 2
            }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
            yPos += 22;
        });
    }
    
    // Créditos
    const credits = scene.add.text(400, 575, 'Made with ❤️ by @iilluminatii191 and Claude Code :D', {
        fontSize: '12px',
        fill: '#aaa',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 2
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    
    scene.tweens.add({
        targets: credits,
        alpha: 0.5,
        duration: 1000,
        yoyo: true,
        repeat: -1
    });
    
    scene.input.keyboard.once('keydown-SPACE', () => {
        overlay.destroy();
        title.destroy();
        instructions.destroy();
        if (highScores.length > 0) {
            // Destruir highscores del home
            scene.children.list.forEach(child => {
                if (child.depth === 301 && child !== overlay && child !== title && child !== instructions && child !== credits) {
                    child.destroy();
                }
            });
        }
        credits.destroy();
        startPreparation(scene);
    });
}

function startPreparation(scene) {
    wave++;
    waveText.setText('Oleada: ' + wave);
    inWave = false;
    preparationTime = 15;
    
    // Limpiar flores anteriores
    nectarFlowers.clear(true, true);
    
    // Más flores con el mapa grande
    for (let i = 0; i < 15 + wave * 3; i++) {
        spawnNectarFlower(scene);
    }
    
    // Moscas
    for (let i = 0; i < 3 + Math.floor(wave / 2); i++) {
        spawnFly(scene);
    }
    
    updateWaveStatus('⏱️ PREPARACIÓN: ' + preparationTime + 's');
    
    if (waveTimer) waveTimer.remove();
    waveTimer = scene.time.addEvent({
        delay: 1000,
        callback: () => {
            preparationTime--;
            if (preparationTime > 0) {
                updateWaveStatus('⏱️ PREPARACIÓN: ' + preparationTime + 's');
            } else {
                startWave(scene);
            }
        },
        repeat: preparationTime
    });
}

function startWave(scene) {
    inWave = true;
    // Dificultad escalante: más enemigos y más fuertes cada oleada
    let enemyCount = 6 + wave * 4;
    enemiesRemaining = enemyCount;
    
    const isBossWave = wave % 5 === 0;
    if (isBossWave) {
        enemiesRemaining += 1;
        updateWaveStatus('⚠️ BOSS! (' + enemiesRemaining + ' enemigos)');
    } else {
        updateWaveStatus('🚨 OLEADA ' + wave + ' (' + enemiesRemaining + ' enemigos)');
    }
    
    let types = ['basic', 'basic', 'fast'];
    if (wave >= 3) types.push('exploder', 'fire');
    if (wave >= 5) types.push('shooter', 'tank');
    if (wave >= 8) types.push('tank', 'shooter'); // Más difíciles
    
    let spawned = 0;
    scene.time.addEvent({
        delay: Math.max(1200 - wave * 30, 600), // Spawn más rápido cada oleada
        callback: () => {
            if (spawned < enemyCount) {
                spawnEnemy(scene, Phaser.Utils.Array.GetRandom(types), wave);
                spawned++;
            }
        },
        repeat: enemyCount - 1
    });
    
    if (isBossWave) {
        scene.time.delayedCall(3000, () => spawnEnemy(scene, 'boss', wave));
    }
    
    // Música más intensa durante oleada
    updateMusicTempo(scene, true);
}

function endWave(scene) {
    inWave = false;
    score += wave * 50;
    scoreText.setText('Score: ' + score);
    
    // Recompensas de oleada
    const bonus = 30 + wave * 10;
    nectar += bonus;
    nectarText.setText('🍯 ' + nectar);
    
    updateWaveStatus('✅ ¡COMPLETADA! +' + bonus + ' néctar');
    
    // Cada 3 oleadas: power-up
    if (wave % 3 === 0) {
        spawnPowerUp(scene, player.x + Phaser.Math.Between(-150, 150), player.y + Phaser.Math.Between(-150, 150));
    }
    
    // Cada 5 oleadas: upgrade permanente
    if (wave % 5 === 0) {
        grantUpgrade(scene);
    }
    
    // Resetear música a tempo normal
    updateMusicTempo(scene, false);
    
    scene.time.delayedCall(3500, () => startPreparation(scene));
}

function spawnPowerUp(scene, x, y) {
    const types = Object.keys(POWER_UP_TYPES);
    const type = Phaser.Utils.Array.GetRandom(types);
    const config = POWER_UP_TYPES[type];
    
    const powerUp = powerUps.create(x, y, 'powerup');
    powerUp.setScale(1.2);
    powerUp.setTint(config.color);
    powerUp.powerType = type;
    powerUp.setDepth(80);
    powerUp.body.setCircle(14);
    
    const label = scene.add.text(x, y - 30, config.emoji, {
        fontSize: '28px'
    }).setOrigin(0.5).setDepth(81);
    
    powerUp.label = label;
    
    scene.tweens.add({
        targets: powerUp,
        y: y - 10,
        duration: 800,
        yoyo: true,
        repeat: -1
    });
}

function collectPowerUp(player, powerUp) {
    currentPowerUp = powerUp.powerType;
    powerUpTime = POWER_UP_TYPES[powerUp.powerType].duration;
    
    createParticles(this, powerUp.x, powerUp.y, POWER_UP_TYPES[powerUp.powerType].color, 20);
    playSound(this, 700, 0.15);
    
    const text = this.add.text(powerUp.x, powerUp.y, POWER_UP_TYPES[powerUp.powerType].name + '!', {
        fontSize: '22px',
        fill: '#fff',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(150);
    
    this.tweens.add({
        targets: text,
        y: powerUp.y - 70,
        alpha: 0,
        duration: 1500,
        onComplete: () => text.destroy()
    });
    
    if (powerUp.powerType === 'shield') {
        player.isShielded = true;
    }
    
    powerUp.label.destroy();
    powerUp.destroy();
    
    updatePowerUpDisplay();
}

function updatePowerUpDisplay() {
    // Remover texto anterior si existe
    if (this.powerUpText) this.powerUpText.destroy();
    
    if (currentPowerUp) {
        const config = POWER_UP_TYPES[currentPowerUp];
        const timeLeft = Math.ceil(powerUpTime / 1000);
        this.powerUpText = this.add.text(400, 550, 
            config.emoji + ' ' + config.name + ' (' + timeLeft + 's)', {
            fontSize: '18px',
            fill: '#fff',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 3,
            backgroundColor: 'rgba(0,0,0,0.7)',
            padding: { x: 12, y: 6 }
        }).setOrigin(0.5).setDepth(201).setScrollFactor(0);
    }
}

function grantUpgrade(scene) {
    const types = ['damage', 'range', 'speed', 'nectar'];
    const type = Phaser.Utils.Array.GetRandom(types);
    upgrades[type]++;
    
    updateUpgradeUI();
    
    const names = {
        damage: 'Daño',
        range: 'Alcance',
        speed: 'Velocidad',
        nectar: 'Producción Néctar'
    };
    
    const text = scene.add.text(400, 300, '⬆️ MEJORA: ' + names[type] + ' +1', {
        fontSize: '32px',
        fill: '#4caf50',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 5,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setDepth(250).setScrollFactor(0);
    
    scene.tweens.add({
        targets: text,
        y: 250,
        alpha: 0,
        duration: 2500,
        onComplete: () => text.destroy()
    });
    
    playSound(scene, 600, 0.2);
}

function spawnNectarFlower(scene) {
    const x = Phaser.Math.Between(200, WORLD_WIDTH - 200);
    const y = Phaser.Math.Between(150, WORLD_HEIGHT - 150);
    const flower = nectarFlowers.create(x, y, 'nectar');
    flower.setScale(0.85);
    flower.body.setCircle(18);
    flower.nectarValue = 25 + upgrades.nectar * 5;
    flower.setDepth(50);
    createRipple(scene, x, y);
}

function spawnFly(scene) {
    let x, y;
    if (enemies.children.size > 0) {
        const enemy = Phaser.Utils.Array.GetRandom(enemies.children.entries);
        x = enemy.x + Phaser.Math.Between(-100, 100);
        y = enemy.y + Phaser.Math.Between(-100, 100);
    } else {
        x = Phaser.Math.Between(200, WORLD_WIDTH - 200);
        y = Phaser.Math.Between(150, WORLD_HEIGHT - 150);
    }
    
    const fly = flies.create(x, y, 'fly');
    fly.setScale(1.3);
    fly.body.setCircle(7);
    fly.setDepth(90);
}

function spawnEnemy(scene, type, waveNum) {
    const config = ENEMY_TYPES[type];
    const sides = [
        { x: -50, y: Phaser.Math.Between(100, WORLD_HEIGHT - 100) },
        { x: WORLD_WIDTH + 50, y: Phaser.Math.Between(100, WORLD_HEIGHT - 100) },
        { x: Phaser.Math.Between(100, WORLD_WIDTH - 100), y: -50 },
        { x: Phaser.Math.Between(100, WORLD_WIDTH - 100), y: WORLD_HEIGHT + 50 }
    ];
    const spawn = Phaser.Utils.Array.GetRandom(sides);
    
    const enemy = enemies.create(spawn.x, spawn.y, 'enemy');
    enemy.setScale(config.size);
    enemy.setTint(config.color);
    enemy.body.setCircle(26);
    
    // Escalar stats con oleada
    const healthMultiplier = 1 + (waveNum * 0.15);
    const speedMultiplier = 1 + (waveNum * 0.08);
    
    enemy.maxHealth = Math.floor(config.health * healthMultiplier);
    enemy.health = enemy.maxHealth;
    enemy.speed = Math.floor(config.speed * speedMultiplier);
    enemy.points = Math.floor(config.points * (1 + waveNum * 0.1));
    enemy.power = config.power;
    enemy.enemyType = type;
    enemy.frozen = false;
    enemy.lastPower = 0;
    enemy.lastLotusAttack = 0;
    enemy.lastTowerAttack = 0; // Inicializar aquí
    enemy.setDepth(70);
    
    // 50% de enemigos atacan torres, 30% atacan lotos, 20% atacan jugador
    const targetRoll = Math.random();
    if (targetRoll < 0.5) {
        enemy.targetType = 'tower'; // Atacan torres
    } else if (targetRoll < 0.8) {
        enemy.attacksLotuses = true; // Atacan lotos
        enemy.targetType = 'player';
    } else {
        enemy.targetType = 'player'; // Atacan jugador
    }
    
    enemy.healthBar = scene.add.graphics().setDepth(71);
    
    enemy.setAlpha(0);
    scene.tweens.add({ targets: enemy, alpha: 1, duration: 500 });
}

function collectNectar(player, flower) {
    nectar += flower.nectarValue;
    nectarText.setText('🍯 ' + nectar);
    createParticles(this, flower.x, flower.y, 0xffd54f, 12);
    createRipple(this, flower.x, flower.y);
    playSound(this, 450, 0.08);
    flower.destroy();
}

function collectFly(player, fly) {
    player.speedBoostTime = this.time.now + 6000;
    createParticles(this, fly.x, fly.y, 0x76ff03, 15);
    playSound(this, 800, 0.1);
    
    const boostText = this.add.text(fly.x, fly.y, '⚡ VELOCIDAD!', {
        fontSize: '20px',
        fill: '#76ff03',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 3
    }).setOrigin(0.5).setDepth(150);
    
    this.tweens.add({
        targets: boostText,
        y: fly.y - 60,
        alpha: 0,
        duration: 1500,
        onComplete: () => boostText.destroy()
    });
    
    fly.destroy();
}

function plantLotus(scene, x, y) {
    const lotus = LOTUS_TYPES[selectedPlant];
    
    if (nectar < lotus.cost) {
        playSound(scene, 150, 0.1);
        return;
    }
    
    let tooClose = false;
    defenseLotuses.children.entries.forEach(existing => {
        if (Phaser.Math.Distance.Between(x, y, existing.x, existing.y) < 70) tooClose = true;
    });
    
    if (tooClose) return;
    
    nectar -= lotus.cost;
    nectarText.setText('🍯 ' + nectar);
    
    const planted = defenseLotuses.create(x, y, 'lotus');
    planted.setScale(0.95);
    planted.setTint(lotus.color);
    planted.lotusType = selectedPlant;
    planted.body.setCircle(30);
    planted.body.setImmovable(true);
    planted.lastAction = 0;
    planted.setDepth(60);
    
    // Durabilidad
    planted.durability = lotus.durability;
    planted.maxDurability = lotus.maxDurability;
    
    // Barra de durabilidad
    planted.durabilityBar = scene.add.graphics().setDepth(61);
    
    if (selectedPlant === 'wall') {
        planted.health = lotus.health;
        planted.maxHealth = lotus.health;
    } else if (selectedPlant === 'generator') {
        planted.lifetime = lotus.lifetime;
        planted.spawnTime = scene.time.now;
    }
    
    planted.emoji = scene.add.text(x, y - 5, lotus.emoji, {
        fontSize: '30px'
    }).setOrigin(0.5).setDepth(62);
    
    createParticles(scene, x, y, lotus.color, 15);
    createRipple(scene, x, y);
    playSound(scene, 650, 0.12);
    
    updateLotusDurabilityBar(planted);
}

function updateLotusDurabilityBar(lotus) {
    if (!lotus.durabilityBar || !lotus.active) return;
    
    lotus.durabilityBar.clear();
    
    let percent, maxVal, currentVal;
    
    if (lotus.lotusType === 'wall') {
        percent = lotus.health / lotus.maxHealth;
        maxVal = lotus.maxHealth;
        currentVal = lotus.health;
    } else if (lotus.lotusType === 'generator') {
        // No mostrar barra para generador
        return;
    } else {
        percent = lotus.durability / lotus.maxDurability;
        maxVal = lotus.maxDurability;
        currentVal = lotus.durability;
    }
    
    // Solo mostrar si no está al 100%
    if (percent < 1) {
        lotus.durabilityBar.fillStyle(0x000000, 0.5);
        lotus.durabilityBar.fillRect(lotus.x - 20, lotus.y + 25, 40, 4);
        
        let color = 0x4caf50;
        if (percent < 0.5) color = 0xff9800;
        if (percent < 0.25) color = 0xf44336;
        
        lotus.durabilityBar.fillStyle(color, 1);
        lotus.durabilityBar.fillRect(lotus.x - 20, lotus.y + 25, 40 * percent, 4);
    }
}

function damageLotus(scene, lotus, damage) {
    if (lotus.lotusType === 'wall') {
        lotus.health -= damage * 20;
        updateLotusDurabilityBar(lotus);
        if (lotus.health <= 0) {
            if (lotus.emoji) lotus.emoji.destroy();
            if (lotus.durabilityBar) lotus.durabilityBar.destroy();
            lotus.destroy();
        }
    } else {
        lotus.durability -= damage;
        updateLotusDurabilityBar(lotus);
        if (lotus.durability <= 0) {
            if (lotus.emoji) lotus.emoji.destroy();
            if (lotus.durabilityBar) lotus.durabilityBar.destroy();
            createParticles(scene, lotus.x, lotus.y, 0x8d6e63, 12);
            lotus.destroy();
        }
    }
}

function updateShooterLotus(scene, lotus, time) {
    const fireRate = LOTUS_TYPES.shooter.fireRate - (upgrades.speed * 100);
    if (time - lotus.lastAction < fireRate) return;
    
    let nearest = null;
    let minDist = LOTUS_TYPES.shooter.range + (upgrades.range * 30);
    
    enemies.children.entries.forEach(enemy => {
        const dist = Phaser.Math.Distance.Between(lotus.x, lotus.y, enemy.x, enemy.y);
        if (dist < minDist) {
            minDist = dist;
            nearest = enemy;
        }
    });
    
    if (nearest) {
        lotus.lastAction = time;
        lotus.durability--;
        updateLotusDurabilityBar(lotus);
        
        if (lotus.durability <= 0) {
            if (lotus.emoji) lotus.emoji.destroy();
            if (lotus.durabilityBar) lotus.durabilityBar.destroy();
            createParticles(scene, lotus.x, lotus.y, 0x8d6e63, 12);
            lotus.destroy();
            return;
        }
        
        if (currentPowerUp === 'multishot') {
            fireProjectile(scene, lotus, nearest, -15);
            fireProjectile(scene, lotus, nearest, 0);
            fireProjectile(scene, lotus, nearest, 15);
        } else {
            fireProjectile(scene, lotus, nearest);
        }
    }
}

function fireProjectile(scene, from, target, angleOffset = 0) {
    const proj = projectiles.create(from.x, from.y, 'projectile');
    proj.setScale(1.3);
    proj.damage = LOTUS_TYPES.shooter.damage + (upgrades.damage * 8);
    if (currentPowerUp === 'damage') proj.damage *= 2;
    proj.fromEnemy = false;
    proj.setDepth(80);
    
    if (angleOffset !== 0) {
        const angle = Phaser.Math.Angle.Between(from.x, from.y, target.x, target.y) + (angleOffset * Math.PI / 180);
        scene.physics.velocityFromAngle(angle * (180 / Math.PI), 380, proj.body.velocity);
    } else {
        scene.physics.moveToObject(proj, target, 400);
    }
    
    playSound(scene, 320, 0.05);
}

function fireEnemyProjectile(scene, enemy) {
    const proj = projectiles.create(enemy.x, enemy.y, 'projectile');
    proj.setScale(0.9);
    proj.setTint(0xff5722);
    proj.damage = 0;
    proj.fromEnemy = true;
    proj.setDepth(80);
    scene.physics.moveToObject(proj, player, 280);
    playSound(scene, 220, 0.06);
}

function updateExplosiveLotus(scene, lotus) {
    enemies.children.entries.forEach(enemy => {
        if (Phaser.Math.Distance.Between(lotus.x, lotus.y, enemy.x, enemy.y) < 55 && lotus.active) {
            lotus.active = false;
            if (lotus.emoji) lotus.emoji.destroy();
            
            const radius = LOTUS_TYPES.explosive.radius + (upgrades.range * 20);
            enemies.children.entries.forEach(e => {
                if (Phaser.Math.Distance.Between(lotus.x, lotus.y, e.x, e.y) < radius) {
                    const damage = LOTUS_TYPES.explosive.damage + (upgrades.damage * 15);
                    damageEnemy(scene, e, damage);
                }
            });
            
            createExplosion(scene, lotus.x, lotus.y);
            playSound(scene, 140, 0.25);
            lotus.destroy();
        }
    });
}

function updateHealerLotus(scene, lotus, time) {
    if (time - lotus.lastAction < LOTUS_TYPES.healer.cooldown) return;
    
    if (Phaser.Math.Distance.Between(lotus.x, lotus.y, player.x, player.y) < 120 && health < 3) {
        lotus.lastAction = time;
        lotus.durability--;
        updateLotusDurabilityBar(lotus);
        if (lotus.durability <= 0) {
            if (lotus.emoji) lotus.emoji.destroy();
            if (lotus.durabilityBar) lotus.durabilityBar.destroy();
            lotus.destroy();
            return;
        }
        health = Math.min(3, health + LOTUS_TYPES.healer.healAmount);
        updateHealthDisplay();
        createParticles(scene, player.x, player.y, 0x4caf50, 20);
        playSound(scene, 650, 0.15);
    }
}

function updateFreezeLotus(scene, lotus, time) {
    if (time - lotus.lastAction < 3200) return;
    
    let froze = false;
    const range = LOTUS_TYPES.freeze.range + (upgrades.range * 25);
    enemies.children.entries.forEach(enemy => {
        if (Phaser.Math.Distance.Between(lotus.x, lotus.y, enemy.x, enemy.y) < range && !enemy.frozen) {
            enemy.frozen = true;
            enemy.setTint(0x00ffff);
            enemy.setVelocity(0);
            froze = true;
            
            scene.time.delayedCall(LOTUS_TYPES.freeze.duration, () => {
                if (enemy.active) {
                    enemy.frozen = false;
                    const config = ENEMY_TYPES[enemy.enemyType];
                    enemy.setTint(config.color);
                }
            });
        }
    });
    
    if (froze) {
        lotus.lastAction = time;
        lotus.durability--;
        updateLotusDurabilityBar(lotus);
        if (lotus.durability <= 0) {
            if (lotus.emoji) lotus.emoji.destroy();
            if (lotus.durabilityBar) lotus.durabilityBar.destroy();
            lotus.destroy();
            return;
        }
        createParticles(scene, lotus.x, lotus.y, 0x00ffff, 15);
        playSound(scene, 850, 0.1);
    }
}

function updateGeneratorLotus(scene, lotus, time) {
    if (time - lotus.lastAction > LOTUS_TYPES.generator.interval) {
        lotus.lastAction = time;
        const production = LOTUS_TYPES.generator.production + (upgrades.nectar * 3);
        nectar += production;
        nectarText.setText('🍯 ' + nectar);
        
        // Texto más grande y visible
        const genText = scene.add.text(lotus.x, lotus.y - 30, '+' + production + ' 🍯', {
            fontSize: '22px',
            fill: '#ffd54f',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(150);
        
        scene.tweens.add({
            targets: genText,
            y: lotus.y - 70,
            alpha: 0,
            duration: 1500,
            onComplete: () => genText.destroy()
        });
        
        // Efecto visual más llamativo
        createParticles(scene, lotus.x, lotus.y, 0xffd54f, 15);
        
        // Anillo de energía
        const ring = scene.add.circle(lotus.x, lotus.y, 10, 0xffd54f, 0.6).setDepth(59);
        scene.tweens.add({
            targets: ring,
            radius: 50,
            alpha: 0,
            duration: 800,
            onComplete: () => ring.destroy()
        });
        
        playSound(scene, 550, 0.1);
    }
    
    if (time - lotus.spawnTime > lotus.lifetime) {
        if (lotus.emoji) lotus.emoji.destroy();
        if (lotus.durabilityBar) lotus.durabilityBar.destroy();
        lotus.destroy();
    }
}

function updateElectricLotus(scene, lotus, time) {
    if (time - lotus.lastAction < 1100) return;
    
    const range = LOTUS_TYPES.electric.range + (upgrades.range * 25);
    const nearby = [];
    enemies.children.entries.forEach(enemy => {
        if (Phaser.Math.Distance.Between(lotus.x, lotus.y, enemy.x, enemy.y) < range) {
            nearby.push(enemy);
        }
    });
    
    if (nearby.length > 0) {
        lotus.lastAction = time;
        lotus.durability--;
        updateLotusDurabilityBar(lotus);
        if (lotus.durability <= 0) {
            if (lotus.emoji) lotus.emoji.destroy();
            if (lotus.durabilityBar) lotus.durabilityBar.destroy();
            lotus.destroy();
            return;
        }
        
        let prev = lotus;
        for (let i = 0; i < Math.min(nearby.length, LOTUS_TYPES.electric.chainCount); i++) {
            const target = nearby[i];
            
            const lightning = scene.add.graphics();
            lightning.lineStyle(3, 0xffeb3b, 0.8);
            lightning.beginPath();
            lightning.moveTo(prev.x, prev.y);
            lightning.lineTo(target.x, target.y);
            lightning.strokePath();
            lightning.setDepth(75);
            
            scene.time.delayedCall(150, () => lightning.destroy());
            
            const damage = LOTUS_TYPES.electric.damage + (upgrades.damage * 5);
            damageEnemy(scene, target, damage);
            prev = target;
        }
        
        playSound(scene, 900, 0.08);
    }
}

function hitEnemy(projectile, enemy) {
    if (!projectile.fromEnemy) {
        damageEnemy(this, enemy, projectile.damage);
        projectile.destroy();
    }
}

function damageEnemy(scene, enemy, damage) {
    enemy.health -= damage;
    
    enemy.healthBar.clear();
    const healthPercent = enemy.health / enemy.maxHealth;
    enemy.healthBar.fillStyle(0x000000, 0.5);
    enemy.healthBar.fillRect(enemy.x - 22, enemy.y - 45, 44, 6);
    enemy.healthBar.fillStyle(healthPercent > 0.5 ? 0x4caf50 : (healthPercent > 0.25 ? 0xff9800 : 0xf44336), 1);
    enemy.healthBar.fillRect(enemy.x - 22, enemy.y - 45, 44 * healthPercent, 6);
    
    if (enemy.health <= 0) {
        killEnemy(scene, enemy);
    }
}

function killEnemy(scene, enemy) {
    enemiesRemaining--;
    nectar += enemy.points;
    score += enemy.points * 2;
    nectarText.setText('🍯 ' + nectar);
    scoreText.setText('Score: ' + score);
    
    if (enemy.power === 'explode') {
        enemies.children.entries.forEach(e => {
            if (Phaser.Math.Distance.Between(enemy.x, enemy.y, e.x, e.y) < 90) {
                damageEnemy(scene, e, 35);
            }
        });
        createExplosion(scene, enemy.x, enemy.y);
    }
    
    const pointsText = scene.add.text(enemy.x, enemy.y, '+' + enemy.points, {
        fontSize: '20px',
        fill: '#ffd54f',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 3
    }).setOrigin(0.5).setDepth(150);
    
    scene.tweens.add({
        targets: pointsText,
        y: enemy.y - 60,
        alpha: 0,
        duration: 1200,
        onComplete: () => pointsText.destroy()
    });
    
    createParticles(scene, enemy.x, enemy.y, 0xff6b6b, 18);
    enemy.healthBar.destroy();
    enemy.destroy();
    playSound(scene, 210, 0.12);
}

function hitPlayer(player, enemy) {
    if (player.invulnerable) return;
    
    if (player.isShielded && currentPowerUp === 'shield') {
        createParticles(this, player.x, player.y, 0x00bcd4, 25);
        playSound(this, 600, 0.1);
        player.isShielded = false;
        currentPowerUp = null;
        powerUpTime = 0;
        updatePowerUpDisplay.call(this);
        return;
    }
    
    health--;
    updateHealthDisplay();
    
    player.invulnerable = true;
    player.setAlpha(0.5);
    
    this.time.addEvent({
        delay: 100,
        callback: () => player.setAlpha(player.alpha === 0.5 ? 1 : 0.5),
        repeat: 12,
        onComplete: () => {
            player.invulnerable = false;
            player.setAlpha(1);
        }
    });
    
    createParticles(this, player.x, player.y, 0xff1744, 22);
    playSound(this, 90, 0.18);
    
    if (health <= 0) gameOver(this, 'player');
}

function updateHealthDisplay() {
    let hearts = '';
    for (let i = 0; i < 3; i++) {
        hearts += i < health ? '❤️' : '🖤';
    }
    healthText.setText(hearts);
}

function updateWaveStatus(text) {
    waveStatusText.setText(text);
}

function createParticles(scene, x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        const p = scene.add.sprite(x, y, 'particle');
        p.setTint(color);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.setDepth(150);
        particles.add(p);
    }
}

function createRipple(scene, x, y) {
    const ripple = scene.add.sprite(x, y, 'ripple');
    ripple.setScale(0.5).setAlpha(0.8).setDepth(3);
    ripples.push(ripple);
}

function createExplosion(scene, x, y) {
    for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2;
        const speed = 3 + Math.random() * 7;
        const p = scene.add.sprite(x, y, 'particle');
        p.setTint(0xff5722);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.setDepth(150);
        particles.add(p);
    }
    
    const circle = scene.add.circle(x, y, 5, 0xff5722, 0.8).setDepth(149);
    scene.tweens.add({
        targets: circle,
        radius: 120,
        alpha: 0,
        duration: 600,
        onComplete: () => circle.destroy()
    });
}

function startMusic(scene) {
    if (!scene.sound.context) return;
    const ctx = scene.sound.context;
    
    const playNote = (freq, duration, volume) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'triangle'; // Más suave que square
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    };
    
    // Melodía arcade-style más agradable (C, E, G, C, E, G, A, G)
    const melody = [
        { freq: 523, dur: 0.2 }, // C5
        { freq: 659, dur: 0.2 }, // E5
        { freq: 784, dur: 0.2 }, // G5
        { freq: 523, dur: 0.2 }, // C5
        { freq: 659, dur: 0.2 }, // E5
        { freq: 784, dur: 0.2 }, // G5
        { freq: 880, dur: 0.15 }, // A5
        { freq: 784, dur: 0.25 }  // G5
    ];
    
    let noteIndex = 0;
    
    musicBeat = scene.time.addEvent({
        delay: musicTempo,
        callback: () => {
            const note = melody[noteIndex % melody.length];
            const vol = inWave ? 0.05 + (dangerLevel * 0.03) : 0.03;
            playNote(note.freq, note.dur, vol);
            
            noteIndex++;
            
            // Ajustar tempo dinámicamente
            if (musicBeat) {
                const targetTempo = inWave ? Math.max(200 - (dangerLevel * 80), 150) : 350;
                musicTempo += (targetTempo - musicTempo) * 0.1;
                musicBeat.delay = musicTempo;
            }
        },
        loop: true
    });
}

function updateMusicTempo(scene, waveActive) {
    inWave = waveActive;
    if (!waveActive) {
        musicTempo = 350;
        dangerLevel = 0;
    }
}

function playSound(scene, freq, duration) {
    if (!scene.sound.context) return;
    const ctx = scene.sound.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
}

function gameOver(scene, reason) {
    player.active = false;
    player.setVelocity(0);
    
    // Reiniciar música
    updateMusicTempo(scene, false);
    
    const overlay = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.92).setDepth(300).setScrollFactor(0);
    
    const gameOverText = scene.add.text(400, 140, '💀 GAME OVER', {
        fontSize: '58px',
        fill: '#ff1744',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 10
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    
    const causeText = reason === 'towers' ? 
        '¡Todos tus bebés murieron!' : 
        '¡Te mataron!';
    
    const cause = scene.add.text(400, 210, causeText, {
        fontSize: '22px',
        fill: '#ff9800',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    
    const stats = scene.add.text(400, 260, 
        'Nivel Alcanzado: ' + wave + '\n' +
        'Score Final: ' + score + '\n' +
        'Bebés salvados: ' + towerBabies + '/5', {
        fontSize: '24px',
        fill: '#fff',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 5,
        align: 'center',
        lineSpacing: 6
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    
    // Sistema de input de nombre
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let nameInput = ['A', 'A', 'A'];
    let currentPos = 0;
    
    const namePrompt = scene.add.text(400, 360, 'Tu nombre (3 letras):', {
        fontSize: '18px',
        fill: '#4dd0e1',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 3
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    
    const nameDisplay = scene.add.text(400, 395, nameInput.join(''), {
        fontSize: '38px',
        fill: '#ffd54f',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 5
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    
    const cursor = scene.add.text(400 - 35 + (currentPos * 35), 420, '▼', {
        fontSize: '18px',
        fill: '#4caf50'
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    
    const instructions = scene.add.text(400, 455, 
        'CLICK = Cambiar letra  |  ESPACIO = Siguiente/Guardar', {
        fontSize: '13px',
        fill: '#aaa',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 2
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    
    scene.tweens.add({
        targets: cursor,
        alpha: 0.3,
        duration: 500,
        yoyo: true,
        repeat: -1
    });
    
    // Eventos de input
    const clickHandler = scene.input.on('pointerdown', () => {
        const currentLetterIndex = letters.indexOf(nameInput[currentPos]);
        nameInput[currentPos] = letters[(currentLetterIndex + 1) % letters.length];
        nameDisplay.setText(nameInput.join(''));
        playSound(scene, 400, 0.05);
    });
    
    const spaceHandler = scene.input.keyboard.on('keydown-SPACE', () => {
        if (currentPos < 2) {
            currentPos++;
            cursor.setX(400 - 35 + (currentPos * 35));
            playSound(scene, 500, 0.05);
        } else {
            // Guardar y mostrar highscores
            const playerName = nameInput.join('');
            highScores.push({ name: playerName, score: score, wave: wave, babies: towerBabies });
            highScores.sort((a, b) => b.score - a.score);
            highScores = highScores.slice(0, 5); // Top 5
            
            // Limpiar input UI
            clickHandler.removeListener('pointerdown');
            spaceHandler.removeListener('keydown-SPACE');
            namePrompt.destroy();
            nameDisplay.destroy();
            cursor.destroy();
            instructions.destroy();
            cause.destroy();
            
            // Mostrar highscores
            showHighScores(scene, overlay, gameOverText, stats);
        }
    });
}

function showHighScores(scene, overlay, gameOverText, stats) {
    const highScoreTitle = scene.add.text(400, 350, '🏆 TOP 5 SCORES 🏆', {
        fontSize: '26px',
        fill: '#ffd54f',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    
    let yPos = 390;
    highScores.forEach((entry, i) => {
        const rank = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i];
        const text = scene.add.text(400, yPos, 
            rank + ' ' + entry.name + ' - Nv.' + entry.wave + ' - ' + entry.score + 'pts - ' + entry.babies + '👶', {
            fontSize: '16px',
            fill: '#fff',
            fontFamily: 'Arial',
            stroke: '#000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
        yPos += 28;
    });
    
    const restart = scene.add.text(400, 540, 'Presiona ESPACIO para reiniciar', {
        fontSize: '22px',
        fill: '#4caf50',
        fontFamily: 'Arial',
        stroke: '#000',
        strokeThickness: 5
    }).setOrigin(0.5).setDepth(301).setScrollFactor(0);
    
    scene.tweens.add({
        targets: restart,
        alpha: 0.3,
        duration: 700,
        yoyo: true,
        repeat: -1
    });
    
    scene.input.keyboard.once('keydown-SPACE', () => {
        scene.scene.restart();
        // Reset completo
        nectar = 150;
        health = 3;
        wave = 0;
        score = 0;
        enemiesRemaining = 0;
        inWave = false;
        selectedPlant = 'shooter';
        ripples = [];
        bubbles = [];
        waterPlants = [];
        currentPowerUp = null;
        powerUpTime = 0;
        upgrades = { damage: 0, range: 0, speed: 0, nectar: 0 };
        musicTempo = 350;
        dangerLevel = 0;
        towers = [];
        towerBabies = 5;
    });
    
    playSound(scene, 70, 1);
}
