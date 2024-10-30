import numpy as np
import typing

class Quaternion:
    def __init__(self, x, y, z, w):
        self.x = x
        self.y = y
        self.z = z
        self.w = w

    def to_rotation_matrix(self):
        """
        Converts a quaternion into a 3x3 rotation matrix.
        """
        return np.array([
            [1 - 2 * (self.y * self.y + self.z * self.z), 2 * (self.x * self.y - self.z * self.w), 2 * (self.x * self.z + self.y * self.w)],
            [2 * (self.x * self.y + self.z * self.w), 1 - 2 * (self.x * self.x + self.z * self.z), 2 * (self.y * self.z - self.x * self.w)],
            [2 * (self.x * self.z - self.y * self.w), 2 * (self.y * self.z + self.x * self.w), 1 - 2 * (self.x * self.x + self.y * self.y)]
        ])

    def __mul__(self, other):
        """
        Multiplies two quaternions.
        """
        x1, y1, z1, w1 = self.x, self.y, self.z, self.w
        x2, y2, z2, w2 = other.x, other.y, other.z, other.w
        return Quaternion(
            w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
            w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
            w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
            w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2
        )

    def normalize(self):
        """
        Normalizes the quaternion to unit length.
        """
        norm = np.sqrt(self.x**2 + self.y**2 + self.z**2 + self.w**2)
        self.x /= norm
        self.y /= norm
        self.z /= norm
        self.w /= norm
        return self

def quaternion_from_tuple(x: typing.Tuple[float, float, float, float]) -> Quaternion:
    return Quaternion(x[0], x[1], x[2], x[3])

def calculate_velocity_from_quaternion(quaternion: Quaternion, speed=10) -> typing.Tuple[float, float, float]:
    # Initial bullet direction in local coordinates (0, 0, -1)
    initial_direction = np.array([0, 0, -1])
    
    # Convert quaternion to rotation matrix
    rotation_matrix = quaternion.to_rotation_matrix()
    
    # Rotate initial direction vector by the rotation matrix
    rotated_direction = np.dot(rotation_matrix, initial_direction)
    
    # Scale the direction by the speed to get the velocity
    velocity = rotated_direction * speed
    
    # Convert to tuple
    return tuple(float(x) for x in velocity)

def calculate_direction_vector(start, target):
    """
    Calculates the normalized direction vector from start to target.
    """
    direction = np.array(target) - np.array(start)
    return direction / np.linalg.norm(direction)

def calculate_target_quaternion(current_direction, target_direction):
    """
    Calculates the quaternion needed to rotate from the current direction to the target direction.
    """
    axis = np.cross(current_direction, target_direction)
    if np.linalg.norm(axis) < 1e-6:
        return Quaternion(0, 0, 0, 1)  # Identity quaternion if already aligned
    
    axis /= np.linalg.norm(axis)
    angle = np.arccos(np.clip(np.dot(current_direction, target_direction), -1.0, 1.0))
    half_angle = angle / 2
    sin_half_angle = np.sin(half_angle)
    
    return Quaternion(
        axis[0] * sin_half_angle,
        axis[1] * sin_half_angle,
        axis[2] * sin_half_angle,
        np.cos(half_angle)
    )

def slerp_quaternions(q1: Quaternion, q2: Quaternion, t: float) -> Quaternion:
    """
    Spherical linear interpolation (slerp) between two quaternions q1 and q2.
    """
    dot_product = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w

    # Ensure shortest path
    if dot_product < 0.0:
        q2 = Quaternion(-q2.x, -q2.y, -q2.z, -q2.w)
        dot_product = -dot_product

    dot_product = np.clip(dot_product, -1.0, 1.0)
    theta_0 = np.arccos(dot_product)
    sin_theta_0 = np.sin(theta_0)

    if sin_theta_0 < 1e-6:
        return q1

    theta = theta_0 * t
    sin_theta = np.sin(theta)

    s1 = np.cos(theta) - dot_product * (sin_theta / sin_theta_0)
    s2 = sin_theta / sin_theta_0

    return Quaternion(
        s1 * q1.x + s2 * q2.x,
        s1 * q1.y + s2 * q2.y,
        s1 * q1.z + s2 * q2.z,
        s1 * q1.w + s2 * q2.w
    ).normalize()

def update_projectile(projectile: dict, target_position: typing.Tuple[float, float, float], max_turn_rate: float, speed: float, delta_time: float) -> dict:
    """
    Updates the projectile's position and rotation.
    projectile: Dictionary containing 'position' and 'rotation' (quaternion as a tuple)
    target_position: The target position the projectile is heading towards
    max_turn_rate: The maximum turn rate per update
    speed: Projectile speed
    delta_time: Time step for the update
    """
    # Current position and rotation
    position = np.array(projectile['location'])
    rotation = quaternion_from_tuple(projectile['rotation'])

    # Calculate current forward direction
    forward = np.array([0, 0, -1])  # Assuming forward is -Z in local space
    rotation_matrix = rotation.to_rotation_matrix()
    current_direction = np.dot(rotation_matrix, forward)

    # Calculate target direction
    target_direction = calculate_direction_vector(position, target_position)

    # Calculate target rotation quaternion
    target_rotation = calculate_target_quaternion(current_direction, target_direction)

    # Slerp between current and target rotation
    new_rotation = slerp_quaternions(rotation, target_rotation, max_turn_rate * delta_time)

    # Move forward in the current direction
    position += current_direction * speed * delta_time

    # Update the projectile's state
    projectile['location'] = tuple(position)
    projectile['rotation'] = (new_rotation.x, new_rotation.y, new_rotation.z, new_rotation.w)
    return projectile
