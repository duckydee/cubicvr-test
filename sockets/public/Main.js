// Editor Log
var Log = {
	
	tailMap : {},
	
	clear 	: function() {
		$("#log").empty();
	},
	
	append 	: function(text, type) {
		if (!type) type = "info";
		$("#log").prepend("<div class='log " + type + "'>" + text + "</div>");
	},
	
	tail 	: function(label, value) {
		if (Log.tailMap[label] == value) return;
		Log.tailMap[label] = value;
		Log.refresh();
	},
	
	untail	: function(label) {
		delete Log.tailMap[label];
		Log.refresh();
	},
	
	refresh : function() {
		$("#tail").empty();
		for (label in Log.tailMap) {
			$("#tail").append("<div class='log'>" + label + " : " + Log.tailMap[label] + "</div>");
		}
	}
	
};
$("#clear").click(function(e) { Log.clear() });

// System Definitions
function CubicVRSystem() {
	
	var self = this;
	
	this.scene 	= null;
	this.light 	= null;	
	this.camera 	= null;
	
	this.floorMaterial 	= null;
	this.floorMesh 		= null;
	this.floorObject 	= null;
	
	// temp
	this.mouseViewController = null;
	
	this.entities = [];
	
	this.init = function() {
		
		CubicVR.start('canvas', this.webGLStart);
		
	};
	
	this.webGLStart = function(gl, canvas) {
	
		self.camera = new CubicVR.Camera({
			name 		: "the_camera",
			fov 		: 60.0,
			position 	: [20.0, 5.0, -25.0],
			lookat 		: [0.0, 0.0, 0.0],
			width 		: canvas.width,
			height 		: canvas.height
		});

		// Create the Light
		self.light = new CubicVR.Light({
		  name 		: "the_light",
		  type 		: "point",
		  position 	: [1.0, 1.5, -2.0]
		});
		
		// floor
		self.floorMaterial = new CubicVR.Material({
		  specular 		: [0, 0, 0],
		  shininess 	: 0.9,
		  env_amount	: 1.0,
		  textures : {
			color :  new CubicVR.Texture("images/concrete3.jpg"),
		  }
		});	
		
		self.floorMesh = CubicVR.primitives.box({
		  size 		: 1.0,
		  material 	: self.floorMaterial,
		  uvmapper 	: {
			projectionMode 	: CubicVR.enums.uv.projection.CUBIC,
			scale 			: [0.05, 0.05, 0.05]
		  }
		}).prepare();
		
		self.floorObject = new CubicVR.SceneObject({
		  mesh 		: self.floorMesh,
		  scale 	: [100, 0.2, 100],
		  position 	: [20, -5, 0],
		});
		
		// Setup the scene
		self.scene = new CubicVR.Scene();
		
		self.scene.bind(self.camera);
		//scene.bind(light);
		self.scene.bind(self.floorObject);
		
		self.mouseViewController = new CubicVR.MouseViewController(canvas, self.camera);
		
		CLIENT.start();
		
		// Add the default scene camera to the resize list to update on browser resize
		//CubicVR.addResizeable(camera);
		
		//CubicVR.MainLoop(update);
		
	}
	
	this.update = function(timer, gl) {		
		var seconds = timer.getSeconds();
		CLIENT.system.action.update();
		CLIENT.system.motion.update();
		
		self.entities.forEach(function (entity) {
			
			entity.renderable.object.x = entity.position.x;
			entity.renderable.object.y = entity.position.y;
			entity.renderable.object.z = entity.position.z;
			
			entity.renderable.textObject.x = entity.position.x;
			entity.renderable.textObject.y = entity.position.y + 2;
			entity.renderable.textObject.z = entity.position.z;
			
            Log.tail(entity.name + " texture", entity.renderable.object.getInstanceMaterials()[0].uvOffset)
            
            //entity.renderable.object.getInstanceMaterials()[0].uvOffset = [Math.cos(seconds+i),Math.sin(seconds+i)];
            
			Log.tail(entity.name, [entity.position.x.toFixed(2), entity.position.y.toFixed(2), entity.position.z.toFixed(2)].join(", "));
			
		});
		
		self.scene.camera.x = CLIENT.player.position.x;
		self.scene.camera.y = CLIENT.player.position.y + 5;
		self.scene.camera.target[0] = CLIENT.player.position.x;
		self.scene.camera.target[1] = CLIENT.player.position.y;
		self.scene.camera.target[2] = CLIENT.player.position.z;
		
        
        
		self.scene.render();
		
		Log.tail("camera", [self.scene.camera.x.toFixed(2), self.scene.camera.y.toFixed(2), self.scene.camera.z.toFixed(2)].join(", "));
		// tail("player", player.x + ", " + player.y + ", " + player.z);
		
	}
	
	this.addEntity = function(entity) {

		if (entity.position && entity.renderable) { 
			this.entities.push(entity);
			this.scene.bind(entity.renderable.object);
			this.scene.bind(entity.renderable.textObject);
		}
		
	}
	
}
function MotionSystem() {
	
	this.entities = [];
	
	this.update = function() {
	
		this.entities.forEach(function(entity) {
			entity.position.x += entity.motion.vx;
			entity.position.y += entity.motion.vy;
			entity.position.z += entity.motion.vz;
			
			entity.motion.vy -= 0.04;
			
			if (entity.position.y < 0.0) {
				entity.position.y = 0.0;
				entity.motion.vy = 0.0;
			}
			
		});
		
	}
	
	this.addEntity = function(entity) {
		
		if (entity.position && entity.motion) {
			this.entities.push(entity);
		}
		
	}
	
}
function InputSystem() {
	
	var self = this;
	
	this.entities = [];
	
	this.inputs = {};
	
	this.key = {};
	
	this.entityKeyAction = {};
	
	this.init = function(element) {
		
		element.addEventListener("keydown", this.keyDown);		
		element.addEventListener("keyup", this.keyUp);
		
	};
	
	this.keyDown = function(event) {
		
		var value = 1;
		
		if (self.key[event.keyCode] != value) {
			self.key[event.keyCode] = value;
			if (self.entityKeyAction[event.keyCode]) {
				self.entityKeyAction[event.keyCode].forEach(function(keyAction) {
					keyAction.entity.action[keyAction.action] = value;
					WEBSOCKET.send(JSON.stringify({
						type 		: "action",
						action 		: keyAction.action,
						position 	: keyAction.entity.position.position,
						value		: value,
					}));
				});
			}
			event.preventDefault();
			return false;
            // Log.tail("Key " + event.keyCode, "pressed");
		}
		
	}
	
	this.keyUp = function(event) {
		
		var value = 0;
		
		self.key[event.keyCode] = value;
		if (self.entityKeyAction[event.keyCode]) {
			self.entityKeyAction[event.keyCode].forEach(function(keyAction) {
				keyAction.entity.action[keyAction.action] = value;
				WEBSOCKET.send(JSON.stringify({
					type 		: "action",
					action 		: keyAction.action,
					position 	: keyAction.entity.position.position,
					value		: value,
				}));
			});
		}
		event.preventDefault();
        return false;
		// Log.untail("Key " + event.keyCode);
		
	}
	
	this.addEntity = function(entity) {
		
		if (entity.input && entity.action) {
			this.entities.push(entity);
			for (var key in entity.input.keyActionMap) {
				if (!self.entityKeyAction[key]) {
					self.entityKeyAction[key] = [];
				}
				self.entityKeyAction[key].push({
				  entity 	: entity,
				  action 	: entity.input.keyActionMap[key],
				});
			}
		}
		
	}

}
function ActionSystem() {
	
	this.entities = [];
	
	this.update = function() {
		
		this.entities.forEach(function(entity) {
			
			entity.action.update(entity);
			
		});
		
	};
	
	this.addEntity = function(entity) {
	
		if (entity.action) {
			this.entities.push(entity);
		}
		
	};
	
}

// Entity
function Entity(id, name, components) {
	
	this.id = id;
	this.name = name;
	
	for (component in components) {
		this[component] = components[component];
	}

}

// Component Definitions
function PositionComponent(position) {
	
	this.position = position;
	Object.defineProperty(this, "x", {
		get : function() { return this.position[0]; },
		set : function(x) { this.position[0] = x; },
	});
	Object.defineProperty(this, "y", {
		get : function() { return this.position[1]; },
		set : function(y) { this.position[1] = y; },
	});
	Object.defineProperty(this, "z", {
		get : function() { return this.position[2]; },
		set : function(z) { this.position[2] = z; },
	});
	
}
function MotionComponent(velocity, acceleration) {
	
	this.velocity = velocity;
	Object.defineProperty(this, "vx", {
		get : function() { return this.velocity[0]; },
		set : function(vx) { this.velocity[0] = vx; },
	});
	Object.defineProperty(this, "vy", {
		get : function() { return this.velocity[1]; },
		set : function(vy) { this.velocity[1] = vy; },
	});
	Object.defineProperty(this, "vz", {
		get : function() { return this.velocity[2]; },
		set : function(vz) { this.velocity[2] = vz; },
	});
	
	if (acceleration) {
		this.acceleration = acceleration;
	} else {
		this.acceleration = [0.0, 0.0, 0.0];
	}
	Object.defineProperty(this, "ax", {
		get : function() { return this.acceleration[0]; },
		set : function(ax) { this.acceleration[0] = ax; },
	});
	Object.defineProperty(this, "ay", {
		get : function() { return this.acceleration[1]; },
		set : function(ay) { this.acceleration[1] = ay; },
	});
	Object.defineProperty(this, "az", {
		get : function() { return this.acceleration[2]; },
		set : function(az) { this.acceleration[2] = az; },
	});

}
function RenderComponent(name) {
	
	// name text
	var textTexture = new CubicVR.TextTexture(name, {
	  align : 'center',
	  font : '18pt Arial'
	});
	var planeMaterial = new CubicVR.Material({
	  //color : [0, 0, 1],
	  textures : {
	    color : textTexture,
        alpha : textTexture
	  }
	});
	var planeMesh = CubicVR.primitives.plane({
	  size : 1.0,
	  material : planeMaterial,
	  uvmapper : {
	    projectionMode : CubicVR.enums.uv.projection.PLANAR,
	    projectionAxis : CubicVR.enums.uv.axis.Z,
	    scale : [1.0, 1.0, 1.0]
	  }
	});
	planeMesh.triangulateQuads().compile().clean();
	
	this.textObject = new CubicVR.SceneObject({
	  mesh 		: planeMesh,
	  scale 	: [1.0, 1.0, 1.0],
	  position 	: [0.0, 0.0, 0.0],
	});
	//
	
    this.texture = new CubicVR.Texture("images/spritesheet.png");
    this.alpha = new CubicVR.Texture("images/spritesheet_alpha.png"),
    
	this.material = new CubicVR.Material({
	  specular 		: [0.0, 0.0, 0.0],
	  shininess 	: 0.0,
	  env_amount 	: 1.0,
	  textures 		: {
		color : this.texture,
        alpha : this.alpha,
	  }
	});
	
    this.mesh = new CubicVR.Mesh({
      primitive: {
        type: "plane",
        size: 1.0,
        material: this.material,
        uvmapper: {
          projectionMode: "planar",
          projectionAxis: "z",
          scale: [10, 10, 10],
        }
      },
      compile: true
    });
    
	// this.mesh = CubicVR.primitives.plane({
	  // size 		: 1.0,
	  // material 	: this.material,
	  // uvmapper 	: {
		// projectionMode  : CubicVR.enums.uv.projection.PLANAR,
		// scale 			: scale
	  // }
	// }).prepare();
	
	this.object = new CubicVR.SceneObject({
	  mesh 		: this.mesh,
	  scale 	: [1.4, 2.0, 1.0],
	  position 	: [0.0, 0.0, 0.0],
	});
	
}
function PlayerActionComponent() {
	
	this.left 	= 0;
	this.right 	= 0;
	this.up 	= 0;
	this.down 	= 0;
	this.jump 	= 0;
	
	this.update = function(entity) {
		
		entity.motion.vx = (this.left - this.right)	* entity.motion.ax;
		entity.motion.vz = (this.up - this.down)	* entity.motion.az;
		
		if (this.jump == 1) {
			this.jump = 0;
			if (entity.position.y == 0) {
				entity.motion.vy = entity.motion.ay;
			}
		}
		
	};
	
}
function InputComponent(keyActionMap) {
	
	this.keyActionMap = keyActionMap;
	
}

// Client
function GameClient() {
	
	this.system = {};
	this.player = null;
	
	this.init = function() {
		
		this.system["input"] 	= new InputSystem();
		this.system["action"]	= new ActionSystem();
		this.system["motion"] 	= new MotionSystem();
		this.system["cubicVR"] 	= new CubicVRSystem();

		this.system.input.init(canvas);
		this.system.cubicVR.init();
		
	};
	
	this.start = function() {
		
		CubicVR.MainLoop(this.system.cubicVR.update);
		
	};
	
	this.addPlayer = function(id, name, position) {
		
		var player = new Entity(id, name, {
		  "position"	: new PositionComponent(position),
		  "motion"		: new MotionComponent([0.0, 0.0, 0.0], [0.2, 1.0, 0.2]),
		  "renderable"	: new RenderComponent(name),
		  "action"		: new PlayerActionComponent(),
		});
		
		this.system.motion.addEntity(player);
		this.system.action.addEntity(player);
		this.system.cubicVR.addEntity(player);
		
		return player;
		
	};
	
}

var canvas = $("#canvas")[0];
canvas.tabIndex = 1;

var GAME_HAS_STARTED = false;

var CLIENT;
var WEBSOCKET;
var PLAYERS = {};

//
//
var enterEvent = function(e) {
	if (e.keyCode == 13 && $("#input").val().split(" ").join("") != "") {	
		if (GAME_HAS_STARTED) {
		
			WEBSOCKET.send(JSON.stringify({
				type 	: "player_message",
				message : $("#input").val(),
			}));
		
		} else {
			start($("#input").val());
			$("#input").removeAttr("placeholder");
		}
		$("#input").val("");
	}
    return false;
}
$("#input")[0].addEventListener("keydown", enterEvent);

//
//
function start(playerName) {
	
	GAME_HAS_STARTED = true;
	
	var host = window.document.location.host.replace(/:.*/, '');
	WEBSOCKET = new WebSocket('ws://' + host + ':8080');
	WEBSOCKET.onopen = function(event) {
		// join the 'game'
		WEBSOCKET.send(JSON.stringify({
		  type 	: "join",
		  name 	: playerName,
		}));
	}
	WEBSOCKET.onmessage = function(event) {
		var data = JSON.parse(event.data);
		
		// message received
		if (data.type == "player_message") {
			Log.append("<b>" + PLAYERS[data.id].name + ":</b> " + data.message, "talk");
		}
		// player has changed
		if (data.type == "player_update") {
			PLAYERS[data.player.id].position.position = data.player.position;
			for (var action in data.player.action) {
				PLAYERS[data.player.id].action[action] = data.player.action[action];
			}
		}
		// all players already connected
		if (data.type == "player_list") {
			for (var player in data.players) {
				PLAYERS[data.players[player].id] = CLIENT.addPlayer(data.players[player].id, data.players[player].name, data.players[player].position);
			}
		}
		// new player connects
		if (data.type == "player_connected") {
			Log.append("Player connected: " + data.player.name, "info");			
			PLAYERS[data.player.id] = CLIENT.addPlayer(data.player.id, data.player.name, data.player.position);
		}
		// clients player id
		if (data.type == "player_id") {
			Log.append("You have joined the server. ID = " + data.id, "info");
			CLIENT.player.id = data.id;
			PLAYERS[data.id] = CLIENT.player;
		}
	};
	
	//
	//
	CLIENT = new GameClient();
	CLIENT.init();

	CLIENT.player = CLIENT.addPlayer(-1, playerName, [20.0, 10.0, 0.0]);

	CLIENT.player.input = new InputComponent({
		// key : action
		"37" : "left",
		"39" : "right",
		"38" : "up",
		"40" : "down",
		"32" : "jump",		  
	});

	CLIENT.system.input.addEntity(CLIENT.player);
	
}
//
//
start("Nick" + Math.round(Math.random()*10000000000));