import numpy as np
import typing

class Quaternion:
    def __init__(self, x, y, z, w):
        self.x = x
        self.y = y
        self.z = z
        self.w = w

    def to_rotation_matrix(self):
        return np.array([
            [1 - 2 * (self.y * self.y + self.z * self.z), 2 * (self.x * self.y - self.z * self.w), 2 * (self.x * self.z + self.y * self.w)],
            [2 * (self.x * self.y + self.z * self.w), 1 - 2 * (self.x * self.x + self.z * self.z), 2 * (self.y * self.z - self.x * self.w)],
            [2 * (self.x * self.z - self.y * self.w), 2 * (self.y * self.z + self.x * self.w), 1 - 2 * (self.x * self.x + self.y * self.y)]
        ], dtype=float)

    def normalize(self):
        norm = np.sqrt(self.x**2 + self.y**2 + self.z**2 + self.w**2)
        self.x /= norm
        self.y /= norm
        self.z /= norm
        self.w /= norm
        return self

    def __mul__(self, other):
        # Quaternion multiplication to combine rotations
        return Quaternion(
            self.w * other.x + self.x * other.w + self.y * other.z - self.z * other.y,
            self.w * other.y - self.x * other.z + self.y * other.w + self.z * other.x,
            self.w * other.z + self.x * other.y - self.y * other.x + self.z * other.w,
            self.w * other.w - self.x * other.x - self.y * other.y - self.z * other.z
        ).normalize()

def quaternion_from_tuple(q_tuple: typing.Tuple[float, float, float, float]) -> Quaternion:
    return Quaternion(q_tuple[0], q_tuple[1], q_tuple[2], q_tuple[3]).normalize()

def calculate_velocity_from_quaternion(quaternion: Quaternion, speed: float) -> typing.Tuple[float, float, float]:
    # Define the base forward direction
    forward_direction = np.array([0, 0, -1], dtype=float)

    # Rotate the forward direction by the quaternion's rotation matrix
    rotation_matrix = quaternion.to_rotation_matrix()
    rotated_direction = np.dot(rotation_matrix, forward_direction)

    # Normalize and scale by speed
    rotated_direction /= np.linalg.norm(rotated_direction)
    velocity = rotated_direction * speed
    return tuple(velocity)

def calculate_target_quaternion(current_position, target_position):
    direction = np.array(target_position) - np.array(current_position)
    direction = direction / np.linalg.norm(direction)
    forward = np.array([0, 0, -1])
    dot_product = np.dot(forward, direction)
    if np.isclose(dot_product, 1.0):
        return Quaternion(0, 0, 0, 1)

    axis = np.cross(forward, direction)
    axis = axis / np.linalg.norm(axis)
    angle = np.arccos(np.clip(dot_product, -1.0, 1.0))
    half_angle = angle / 2
    sin_half_angle = np.sin(half_angle)

    return Quaternion(
        axis[0] * sin_half_angle,
        axis[1] * sin_half_angle,
        axis[2] * sin_half_angle,
        np.cos(half_angle)
    ).normalize()

def rotation_difference(q1, q2):
    # Calculate the relative rotation needed to get from q1 to q2
    return Quaternion(
        q2.x * q1.w - q2.w * q1.x - q2.y * q1.z + q2.z * q1.y,
        q2.y * q1.w - q2.w * q1.y - q2.z * q1.x + q2.x * q1.z,
        q2.z * q1.w - q2.w * q1.z - q2.x * q1.y + q2.y * q1.x,
        q2.w * q1.w + q2.x * q1.x + q2.y * q1.y + q2.z * q1.z
    ).normalize()

def capped_rotation(current_rotation, target_rotation, max_turn_rate, delta_time):
    rotation_diff = rotation_difference(current_rotation, target_rotation)
    angle = 2 * np.arccos(np.clip(rotation_diff.w, -1.0, 1.0))
    max_angle = max_turn_rate * delta_time

    if angle > max_angle:
        scale = max_angle / angle
        sin_half_angle = np.sin(max_angle / 2)
        rotation_diff = Quaternion(
            rotation_diff.x * sin_half_angle / np.sin(angle / 2),
            rotation_diff.y * sin_half_angle / np.sin(angle / 2),
            rotation_diff.z * sin_half_angle / np.sin(angle / 2),
            np.cos(max_angle / 2)
        ).normalize()

    return current_rotation * rotation_diff

def update_projectile(projectile: dict, target_position: typing.Tuple[float, float, float], max_turn_rate: float, speed: float, delta_time: float) -> dict:
    position = np.array(projectile['location'])
    current_rotation = quaternion_from_tuple(projectile['rotation'])

    # Step 1: Calculate the target rotation directly pointing at the target
    target_rotation = calculate_target_quaternion(position, target_position)

    # Step 2: Apply capped rotation difference
    new_rotation = capped_rotation(current_rotation, target_rotation, max_turn_rate, delta_time)

    # Step 3: Move forward in the direction of the new rotation
    forward_direction = np.array([0, 0, -1], dtype=float)
    rotation_matrix = new_rotation.to_rotation_matrix()
    move_direction = np.dot(rotation_matrix, forward_direction)
    move_direction = move_direction / np.linalg.norm(move_direction)  # Ensure normalized

    position += move_direction * speed * delta_time

    # Update the projectile's state
    projectile['location'] = tuple(position)
    projectile['rotation'] = (new_rotation.x, new_rotation.y, new_rotation.z, new_rotation.w)
    return projectile
